import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Batched RunScore cleanup. Keeps each player's TOP 5 runs per bucket:
//   • Weekly normal runs:  (wallet, week_id, arena ∉ endless/raid) → top 5
//   • Endless runs:        (wallet, arena_id='endless')            → top 5
//   • World boss arena:    never pruned (raid contribution log)
//
// Driven by the client in small batches. Modes:
//   { mode: 'list_wallets', cursor }            → return wallets from a slice of the table
//   { mode: 'prune_one', wallet, dryRun }       → process one wallet
//
// Auth: emergency admin key OR Base44 session + 'owner' permission.

// 429-aware retry helper.
async function with429Retry(fn, label = 'op') {
    let lastErr;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const status = err?.status || err?.response?.status;
            const msg = String(err?.message || '').toLowerCase();
            const is429 = status === 429 || msg.includes('rate limit') || msg.includes('429');
            if (!is429 || attempt === 4) throw err;
            const backoff = 800 * Math.pow(2, attempt) + Math.random() * 400;
            console.warn(`[pruneRunScores] ${label} 429 — retry ${attempt + 1}/4 after ${Math.round(backoff)}ms`);
            await new Promise(r => setTimeout(r, backoff));
        }
    }
    throw lastErr;
}

Deno.serve(async (req) => {
    try {
        const body = await req.json().catch(() => ({}));
        const { adminKey, mode = 'prune_one', wallet = null, dryRun = false, cursor = 0 } = body;

        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;

        // Auth
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            const callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await db.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('owner')) {
                return Response.json({ error: "Forbidden — owner permission required" }, { status: 403 });
            }
        }

        // ── Mode: list_wallets ────────────────────────────────────────
        // Walks a slice of the RunScore table (PAGES_PER_CALL pages) and returns
        // wallet addresses found. Client repeats with returned cursor until done=true.
        if (mode === 'list_wallets') {
            const PAGE = 500;
            const PAGES_PER_CALL = 4; // ~2k rows per call — safely under rate limit
            const wallets = new Set();
            let runsScanned = 0;
            let done = false;
            let nextCursor = cursor;
            const startPage = Math.max(1, cursor + 1);
            for (let i = 0; i < PAGES_PER_CALL; i++) {
                const page = startPage + i;
                const batch = await with429Retry(
                    () => db.entities.RunScore.filter({}, '-created_date', PAGE, page),
                    `list page ${page}`
                );
                if (!batch || batch.length === 0) { done = true; break; }
                runsScanned += batch.length;
                for (const r of batch) {
                    const w = (r.wallet_address || '').toLowerCase();
                    if (w) wallets.add(w);
                }
                nextCursor = page;
                if (batch.length < PAGE) { done = true; break; }
                // Throttle between pages.
                await new Promise(r => setTimeout(r, 500));
            }
            return Response.json({
                wallets: [...wallets].sort(),
                runsScanned,
                cursor: nextCursor,
                done,
            });
        }

        // ── Mode: prune_one ───────────────────────────────────────────
        // Process one wallet: fetch all their runs, group into buckets,
        // delete anything beyond top-5 per bucket.
        if (mode === 'prune_one') {
            if (!wallet) return Response.json({ error: 'wallet required for prune_one' }, { status: 400 });
            const walletLower = wallet.toLowerCase();

            // CRITICAL: RunScore.wallet_address is stored with ORIGINAL casing
            // (saveScore writes me.wallet_address directly, not lowercased).
            // Filtering by walletLower returned 0 rows for any mixed-case wallet,
            // and the fallback path was unreachable (wallet === walletLower since
            // list_wallets returns lowercased wallets). The prune then sliced
            // "top 5" from an incomplete/empty result and deleted real high scores.
            //
            // Fix: fetch with BOTH casings and merge by id. Safe because Base44
            // entity filters are case-sensitive on string fields.
            const PAGE = 500;
            const allMap = new Map();
            const fetchAll = async (filterValue, label) => {
                for (let page = 1; page <= 20; page++) {
                    const batch = await with429Retry(
                        () => db.entities.RunScore.filter({ wallet_address: filterValue }, '-score', PAGE, page),
                        label + ` p${page}`
                    );
                    if (!batch || batch.length === 0) break;
                    for (const r of batch) allMap.set(r.id, r);
                    if (batch.length < PAGE) break;
                }
            };
            await fetchAll(walletLower, `prune fetch lc ${walletLower.slice(0,8)}`);
            if (wallet !== walletLower) {
                await fetchAll(wallet, `prune fetch orig ${walletLower.slice(0,8)}`);
            }
            const all = Array.from(allMap.values());

            // SAFETY: if the wallet appeared in list_wallets but we found 0 rows,
            // something is wrong (case mismatch we can't resolve, RLS, etc.).
            // REFUSE to delete — better to skip than delete the wrong rows.
            if (all.length === 0) {
                console.warn(`[pruneRunScores] ${walletLower}: 0 runs fetched — refusing to prune`);
                return Response.json({
                    wallet: walletLower,
                    runsScanned: 0,
                    bucketStats: [],
                    deleted: 0,
                    failed: 0,
                    skipped: 'no runs found — refused to prune (possible case mismatch)',
                    dryRun,
                });
            }

            // Group, drop world_boss_arena entirely.
            const groups = new Map();
            for (const r of all) {
                if (r.arena_id === 'world_boss_arena') continue;
                const bucket = r.arena_id === 'endless' ? 'endless' : `weekly:${r.week_id || 'unknown'}`;
                if (!groups.has(bucket)) groups.set(bucket, []);
                groups.get(bucket).push(r);
            }

            const idsToDelete = [];
            const bucketStats = [];
            for (const [bucket, runs] of groups) {
                runs.sort((a, b) => (b.score || 0) - (a.score || 0));
                const excess = runs.length > 5 ? runs.slice(5) : [];
                const topKeptScore = runs[0]?.score || 0;
                const lowestKeptScore = runs[Math.min(4, runs.length - 1)]?.score || 0;
                const highestPrunedScore = excess[0]?.score || 0;
                bucketStats.push({
                    bucket,
                    total: runs.length,
                    kept: Math.min(5, runs.length),
                    pruned: excess.length,
                    topKeptScore,
                    lowestKeptScore,
                    highestPrunedScore,
                });
                // Sanity: highest pruned score must be < lowest kept score.
                if (excess.length > 0 && highestPrunedScore > lowestKeptScore) {
                    console.error(`[pruneRunScores] SANITY FAIL ${walletLower} ${bucket}: pruning ${highestPrunedScore} but keeping ${lowestKeptScore} — REFUSING`);
                    return Response.json({
                        wallet: walletLower,
                        runsScanned: all.length,
                        bucketStats,
                        deleted: 0,
                        failed: 0,
                        skipped: `sanity check failed in bucket ${bucket}`,
                        dryRun,
                    });
                }
                for (const r of excess) idsToDelete.push(r.id);
            }

            if (dryRun) {
                return Response.json({
                    wallet: walletLower,
                    runsScanned: all.length,
                    bucketStats,
                    runsToDelete: idsToDelete.length,
                    dryRun: true,
                });
            }

            // Delete in small chunks with retry. 404 = already gone (saveScore
            // also prunes), treat as success.
            const CHUNK = 8;
            let deleted = 0;
            let failed = 0;
            for (let i = 0; i < idsToDelete.length; i += CHUNK) {
                const chunk = idsToDelete.slice(i, i + CHUNK);
                const results = await Promise.all(chunk.map(id =>
                    with429Retry(() => db.entities.RunScore.delete(id), `delete ${id}`)
                        .then(() => true)
                        .catch(e => {
                            const status = e?.status || e?.response?.status;
                            const msg = String(e?.message || '');
                            if (status === 404 || msg.includes('404') || msg.toLowerCase().includes('not found')) return true;
                            console.warn(`[pruneRunScores] delete ${id} failed:`, msg);
                            return false;
                        })
                ));
                deleted += results.filter(Boolean).length;
                failed += results.filter(r => !r).length;
                if (i + CHUNK < idsToDelete.length) await new Promise(r => setTimeout(r, 250));
            }

            return Response.json({
                wallet: walletLower,
                runsScanned: all.length,
                bucketStats,
                deleted,
                failed,
                dryRun: false,
            });
        }

        return Response.json({ error: 'Unknown mode' }, { status: 400 });
    } catch (error) {
        console.error('[pruneRunScores]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});