// 0.8.54: filter(query, sort, limit, skip, fields) — the prune relies on `fields`
// so it never downloads an old backup's contents just to read its date.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Data backup — "parts" format (v2), remade 2026-10-20.
//
// WHY: the old version wrote EVERY table into ONE DataBackup row. From 28 Sept
// 2026 that single giant write started hitting the database's 20s timeout on
// every run (reads were fine; the write died), so the workflow auto-disabled
// after 5 failures and nothing was backed up for 3 weeks. The data had not
// grown between the last success and the first failure — the timing lines up
// with the Base44 plan change on 26 Sept, so assume tight limits from now on.
//
// HOW IT WORKS NOW:
//   1. A small DataBackup "manifest" row is created first (status in_progress).
//   2. Each table is read, then written as DataBackupPart rows of ~700 KB each,
//      one small write at a time, each retried on a timeout.
//   3. The manifest is updated to status "complete" with counts as the LAST
//      step. A manifest that is not "complete" is not a backup — never trust one.
//   4. Only after a complete backup are automated backups older than 14 days
//      pruned (manifest + its parts; old single-row backups too).
//
// Covers every table except three history logs (listed above TABLES) — the old
// version covered 14 of 33, each cut off at 5,000 rows. Records keep their
// original ids/dates so a future restore can put them back as they were.
//
// Restore for this format is NOT built yet — manifests are written with
// restore_available:false so the admin panel's Restore button stays disabled,
// and restoreDataBackup refuses this format. The OLD restore re-created
// records with new ids, which breaks every cross-table link; do not use it.
//
// Auth (K-A2 part 2, T-001, 21 Oct 2026): emergency master key (AdminDash), OR an admin-role
// caller — which is how the scheduled workflow arrives (same check proven on refreshSkuPrices) —
// OR a signed-in wallet with 'manage_backups'/'owner' in AdminWallet (the dashboard buttons).
// `is_automated` is ONLY a label now (backup_type + whether old automated backups are pruned);
// it used to skip all auth, so anyone could start full backups and burn the write quota.

// Deliberately LEFT OUT (Rob, 2026-10-20): DeletedRunScore, RunHistoryLog and
// GoldSpendLog. They are history logs, not needed to put the game back as it was,
// and they are the bulk of the data — including them blew the Builder plan's
// "entity write traffic volume" limit. TokenSpendLog stays: payout pools derive from it.
const TABLES = [
    // core player + economy
    'PlayerSave', 'RunScore', 'TokenPool', 'TokenSpendLog',
    'PayoutLog', 'DailyActivityLog', 'WeeklyKillSnapshot', 'CosmeticAsset',
    // squads
    'Squad', 'SquadMember', 'SquadMessage', 'SquadJoinRequest', 'SquadDailyGoal', 'SquadWar',
    'SquadWarMemberKill', 'SquadSeasonRoster', 'SquadChampionsPayoutLog', 'SquadMeteor', 'SquadMeteorAttack',
    // raid / boss
    'GlobalBoss', 'GlobalBossContribution', 'GlobalBossEvent',
    // admin / config / moderation
    'AppConfig', 'AdminWallet', 'AdminChangesLog', 'BlacklistedWallet', 'MutedWallet',
    'OmenAuthEvent', 'SyncBlockLog',
    // accounts (wallet links)
    'User',
];

// Base44 silently stops a single list() at 5,000 rows (found 2026-10-20: four tables
// came back at exactly 5,000 while holding more). So every table is read in pages.
const PAGE_SIZE = 2000;
const MAX_ROWS_PER_TABLE = 200_000; // safety stop; hitting it is flagged as a warning
const PART_TARGET_BYTES = 700_000;  // keep each write small and quick
const RETENTION_DAYS = 14;
const FORMAT = 'parts-v2';

// Pause between piece writes so the backup never bursts past the plan's write limit.
const WRITE_GAP_MS = 400;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function withRetry(fn, label, attempts = 4) {
    let lastErr;
    for (let attempt = 0; attempt < attempts; attempt++) {
        try { return await fn(); }
        catch (e) {
            lastErr = e;
            const msg = String(e?.message || '').toLowerCase();
            const status = e?.status || e?.response?.status;
            // "App entity write traffic volume limit exceeded" = the plan's burst cap: wait it out, longer.
            const isVolumeLimit = msg.includes('volume limit') || msg.includes('traffic');
            const isTransient = isVolumeLimit || status === 429 || (status >= 500 && status <= 504)
                || msg.includes('timed out') || msg.includes('timeout') || msg.includes('rate limit');
            if (!isTransient || attempt === attempts - 1) throw e;
            const delay = isVolumeLimit
                ? 15000 * (attempt + 1)
                : 1000 * Math.pow(2, attempt) + Math.random() * 500;
            console.warn(`[backupData] ${label} transient error — retry ${attempt + 1}/${attempts - 1} in ${Math.round(delay)}ms: ${e?.message}`);
            await sleep(delay);
        }
    }
    throw lastErr;
}

function chunkBySize(rows) {
    const chunks = [];
    let cur = [], curBytes = 0;
    for (const r of rows) {
        const b = JSON.stringify(r).length;
        if (cur.length > 0 && curBytes + b > PART_TARGET_BYTES) { chunks.push(cur); cur = []; curBytes = 0; }
        cur.push(r); curBytes += b;
    }
    if (cur.length > 0) chunks.push(cur);
    return chunks;
}

async function deleteBackupWithParts(db, backupId) {
    // Delete this backup's parts a page at a time, then the manifest.
    for (let i = 0; i < 200; i++) {
        const parts = await withRetry(() => db.entities.DataBackupPart.filter({ backup_id: backupId }, 'chunk_index', 50, 0, ['id']), 'prune parts read');
        if (!parts.length) break;
        for (const p of parts) { try { await withRetry(() => db.entities.DataBackupPart.delete(p.id), 'prune part delete'); } catch {} }
        parts.length = 0;
    }
    await withRetry(() => db.entities.DataBackup.delete(backupId), 'prune manifest delete');
}

Deno.serve(async (req) => {
    const started = Date.now();
    let manifestId = null;
    let db = null;
    try {
        const base44 = createClientFromRequest(req);
        db = base44.asServiceRole;
        const body = await req.json().catch(() => ({}));
        const { adminKey, backup_notes, is_automated } = body;

        const keyOk = !!adminKey && adminKey === Deno.env.get('AdminDash');
        // auth.me() throws when there is no signed-in user — treat that as anonymous.
        let me = null;
        if (!keyOk) { try { me = await base44.auth.me(); } catch { me = null; } }
        let callerWallet = keyOk ? 'EMERGENCY_KEY' : (is_automated ? 'AUTOMATION' : 'ADMIN');
        if (!keyOk && me?.role !== 'admin') {
            if (!me) return Response.json({ error: 'Forbidden' }, { status: 403 });
            callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await db.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('manage_backups') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'manage_backups' permission required" }, { status: 403 });
            }
        }

        const backup_name = `backup-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substring(2, 8)}`;
        console.log(`[backupData] Starting ${FORMAT} backup ${backup_name}`);

        // 1. Manifest first — small write.
        const manifest = await withRetry(() => db.entities.DataBackup.create({
            backup_name,
            backup_type: is_automated ? 'automated' : 'manual',
            snapshot_data: { format: FORMAT, status: 'in_progress', started_at: new Date().toISOString() },
            entity_counts: {},
            restore_available: false,
            notes: backup_notes || '',
        }), 'manifest create');
        manifestId = manifest.id;

        // 2. Each table → parts.
        const entity_counts = {};
        const warnings = [];
        let partCount = 0, totalBytes = 0;
        for (const table of TABLES) {
            const rows = [];
            try {
                for (let skip = 0; skip < MAX_ROWS_PER_TABLE; skip += PAGE_SIZE) {
                    const page = await withRetry(() => db.entities[table].list('created_date', PAGE_SIZE, skip), `${table} read @${skip}`);
                    rows.push(...page);
                    if (page.length < PAGE_SIZE) break;
                }
            } catch (e) {
                // A missing/unreadable table must not lose the rest of the backup — record it loudly.
                warnings.push(`${table}: read failed — ${e?.message}`);
                console.error(`[backupData] ${table} read failed:`, e?.message);
                continue;
            }
            entity_counts[table] = rows.length;
            if (rows.length >= MAX_ROWS_PER_TABLE) warnings.push(`${table}: hit the ${MAX_ROWS_PER_TABLE} safety stop — may be incomplete`);
            // Same id twice would mean the pages shifted under us (rows written mid-read).
            if (new Set(rows.map(r => r.id)).size !== rows.length) warnings.push(`${table}: duplicate ids across pages — rows changed during the read`);
            const chunks = chunkBySize(rows);
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                totalBytes += JSON.stringify(chunk).length;
                await withRetry(() => db.entities.DataBackupPart.create({
                    backup_id: manifestId,
                    entity_name: table,
                    chunk_index: i,
                    record_count: chunk.length,
                    records: chunk,
                }), `${table} part ${i}`);
                partCount++;
                await sleep(WRITE_GAP_MS);
            }
            rows.length = 0;
        }

        // 3. Completion stamp — LAST. Only a "complete" manifest is a backup.
        const secs = Math.round((Date.now() - started) / 1000);
        await withRetry(() => db.entities.DataBackup.update(manifestId, {
            entity_counts,
            snapshot_data: {
                format: FORMAT, status: 'complete',
                completed_at: new Date().toISOString(),
                tables: Object.keys(entity_counts).length, parts: partCount, bytes: totalBytes,
                seconds: secs, warnings,
            },
        }), 'manifest complete');
        const totalRecords = Object.values(entity_counts).reduce((a, b) => a + b, 0);
        console.log(`[backupData] Backup complete: ${backup_name} — ${totalRecords} records, ${Object.keys(entity_counts).length} tables, ${partCount} parts, ${Math.round(totalBytes / 1024)} KB, ${secs}s, ${warnings.length} warning(s)`);
        if (warnings.length) console.warn('[backupData] warnings:', JSON.stringify(warnings));

        // 4. Retention — only automated backups, only after this one completed.
        // Reads ONLY id + date: an old single-row backup is 50–100 MB, and reading
        // one in full to check its date took minutes and made every run time out
        // (found 2026-10-20). Time-capped so a slow prune can never fail a backup
        // that has already saved — whatever is left is picked up next run.
        let pruned = 0;
        if (is_automated) {
            const PRUNE_BUDGET_MS = 60_000;
            const pruneStart = Date.now();
            try {
                const cutoffMs = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
                const candidates = await withRetry(
                    () => db.entities.DataBackup.filter({ backup_type: 'automated' }, 'created_date', 100, 0, ['id', 'created_date']),
                    'prune read');
                for (const c of candidates) {
                    if (Date.now() - pruneStart > PRUNE_BUDGET_MS) { console.warn('[backupData] prune time budget used — rest next run'); break; }
                    if (c.id === manifestId) continue;
                    if (new Date(c.created_date).getTime() >= cutoffMs) break; // oldest-first: everything after is newer
                    try {
                        // New-format backups have parts; old single-row ones have none.
                        await deleteBackupWithParts(db, c.id);
                        pruned++;
                    } catch (e) { console.error('[backupData] prune of', c.id, 'failed:', e?.message); break; }
                }
                if (pruned > 0) console.log(`[backupData] Pruned ${pruned} automated backup(s) older than ${RETENTION_DAYS} days`);
            } catch (e) {
                console.error('[backupData] Retention prune failed:', e?.message);
            }
        }

        return Response.json({ success: true, backup_id: manifestId, backup_name, format: FORMAT, entity_counts, parts: partCount, warnings, pruned });
    } catch (error) {
        console.error('[backupData] Error:', error?.message);
        // Mark the manifest failed so nobody mistakes it for a backup.
        if (manifestId && db) {
            try {
                await db.entities.DataBackup.update(manifestId, {
                    snapshot_data: { format: FORMAT, status: 'failed', error: String(error?.message || error), failed_at: new Date().toISOString() },
                });
            } catch {}
        }
        return Response.json({ error: error?.message }, { status: 500 });
    }
});
