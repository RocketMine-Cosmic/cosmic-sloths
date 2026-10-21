import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { grantActivityPoints, loadPointsConfig, utcDay } from '../../shared/omenxPoints.ts';
import { currentWeekId } from '../../shared/treasuryBuff.ts';

// Omen activity points — weekly placement, plus the retry sweep for any grant left unfinished.
// Plan: project doc claude/handoffs/ACTIVITY_POINTS.md.
//
// Runs hourly ("Activity points — weekly placement + retries" workflow). Safe to repeat: every grant
// has a deterministic key and PointGrantLog remembers it, so a second run grants nothing new.
//
// It only READS the results the token payouts already wrote, so it never touches a payout:
//   - weekly score / kills boards: PayoutLog rows (period_type weekly / weekly_kills, rank 1-10) for
//     the last two finished ISO weeks. They exist once Rob has run the Monday payouts.
//   - Squad War wins: resolved SquadWar rows with a decisive result (win_a / win_b; no ties or byes)
//     for those weeks; every current member of the winning squad.
//   - Squad Champions: SquadSeasonRoster rows with final_rank 1 written in the last 14 days.
// Admin / scheduler / AdminDash only. body.dryRun = true lists what it would grant.

async function isAdminCaller(base44: any, body: any) {
    const key = body?.adminKey || body?.args?.adminKey;
    if (key && key === Deno.env.get('AdminDash')) return true;
    try { const me = await base44.auth.me(); return me?.role === 'admin'; } catch { return false; }
}

function weekBefore(weekId: string, n: number) {
    // Monday of `weekId` minus n weeks, back to an ISO week id.
    const [y, w] = weekId.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7 - n * 7);
    return currentWeekId(monday);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json().catch(() => ({}));
        if (!(await isAdminCaller(base44, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
        const db = base44.asServiceRole;
        const cfg = await loadPointsConfig(db);
        const dryRun = body?.dryRun === true || body?.args?.dryRun === true;
        if (!cfg.enabled && !dryRun) return Response.json({ ok: true, enabled: false });

        const a = cfg.amounts;
        const placeAmount = (tiers: number[], rank: number) =>
            rank === 1 ? tiers[0] : rank === 2 ? tiers[1] : rank === 3 ? tiers[2] : (rank >= 4 && rank <= 10 ? tiers[3] : 0);

        const thisWeek = currentWeekId();
        const weeks = [weekBefore(thisWeek, 1), weekBefore(thisWeek, 2)];
        const todo: any[] = [];

        for (const weekId of weeks) {
            for (const [ptype, ev, tiers] of [['weekly', 'wscore', a.wscore], ['weekly_kills', 'wkills', a.wkills]] as const) {
                const rows = await db.entities.PayoutLog.filter({ period_id: weekId, period_type: ptype }, 'rank', 200);
                const seen = new Set<string>();
                for (const r of rows || []) {
                    const w = String(r.wallet_address || '').toLowerCase();
                    const rank = Number(r.rank || 0);
                    const amt = placeAmount(tiers as number[], rank);
                    if (!amt || seen.has(w)) continue;
                    seen.add(w);
                    todo.push({ wallet: w, event: ev, amount: amt, idempotencyKey: `ap-${ev}-${weekId}-${w}`, periodId: weekId, why: `${ptype} rank ${rank}` });
                }
            }
            const wars = await db.entities.SquadWar.filter({ week_id: weekId, is_resolved: true }, '-created_date', 200);
            for (const war of wars || []) {
                if (!['win_a', 'win_b'].includes(war.result_kind) || !war.winner_squad_id) continue;
                const members = await db.entities.SquadMember.filter({ squad_id: war.winner_squad_id }, '-created_date', 100);
                for (const m of members || []) {
                    const w = String(m.wallet_address || '').toLowerCase();
                    if (!w) continue;
                    todo.push({ wallet: w, event: 'war', amount: a.war, idempotencyKey: `ap-war-${war.id}-${w}`, periodId: weekId, why: `squad war win ${weekId}` });
                }
            }
        }

        const since = new Date(Date.now() - 14 * 86400000).toISOString();
        const champs = await db.entities.SquadSeasonRoster.filter({ final_rank: 1, created_date: { $gte: since } }, '-created_date', 20);
        for (const c of champs || []) {
            for (const raw of c.wallet_addresses || []) {
                const w = String(raw || '').toLowerCase();
                if (!w) continue;
                todo.push({ wallet: w, event: 'champs', amount: a.champs, idempotencyKey: `ap-champs-${c.period_id}-${w}`, periodId: c.period_id, why: `squad champions ${c.period_id}` });
            }
        }

        // Retry sweep: grants left pending (a claim hit its time cap) or error (no final answer).
        const cutoff = new Date(Date.now() - 2 * 60000).toISOString();
        const stale = [
            ...(await db.entities.PointGrantLog.filter({ outcome: 'pending', created_date: { $lte: cutoff } }, '-created_date', 200) || []),
            ...(await db.entities.PointGrantLog.filter({ outcome: 'error' }, '-created_date', 200) || []),
        ];
        for (const r of stale) {
            if (Number(r.attempts || 0) >= 12) continue; // give up quietly after ~3 sweeps; visible in the log
            todo.push({ wallet: r.wallet_address, event: r.event, amount: r.amount, idempotencyKey: r.idempotency_key, periodId: r.period_id, dayKey: r.day_key, why: `retry (${r.outcome})` });
        }

        if (dryRun) return Response.json({ ok: true, dryRun: true, enabled: cfg.enabled, weeks, count: todo.length, todo });

        // Base44 stops a function at 5 minutes (the first run on 21 Oct hit that at grant 69 of ~75).
        // Stop cleanly well before it; whatever is left is picked up by the next hourly run, and the
        // fixed keys mean nothing is granted twice. Grants already logged are skipped up front so a
        // big backlog doesn't spend the time budget re-checking finished ones.
        const started = Date.now();
        const BUDGET_MS = 200_000;
        const doneKeys = new Set<string>();
        for (const chunk of [todo.slice(0, 100), todo.slice(100, 200)]) {
            if (!chunk.length) continue;
            const rows = await db.entities.PointGrantLog.filter({ idempotency_key: { $in: chunk.map((g: any) => g.idempotencyKey) } }, '-created_date', 200);
            for (const r of rows || []) if (['granted', 'refused', 'not_in_game', 'guard'].includes(r.outcome)) doneKeys.add(r.idempotency_key);
        }
        const results: any[] = [];
        const today = utcDay();
        let leftForNextRun = 0;
        for (const g of todo) {
            if (doneKeys.has(g.idempotencyKey)) continue;
            if (Date.now() - started > BUDGET_MS) { leftForNextRun++; continue; }
            const r = await grantActivityPoints(db, { ...g, dayKey: g.dayKey || today, config: cfg });
            if (!r.already) {
                results.push({ key: g.idempotencyKey, why: g.why, outcome: r.outcome, credited: r.credited, reason: r.reason || '' });
                await sleep(150); // spread calls a little
            }
        }
        const granted = results.filter(r => r.outcome === 'granted').reduce((s, r) => s + (r.credited || 0), 0);
        if (results.length) console.log(`[grantWeeklyPlacementPoints] ${results.length} new outcomes, ${granted} points granted`);
        if (leftForNextRun) console.log(`[grantWeeklyPlacementPoints] time budget reached; ${leftForNextRun} left for the next hourly run`);
        return Response.json({ ok: true, weeks, checked: todo.length, newOutcomes: results.length, granted, leftForNextRun, results });
    } catch (e) {
        console.error('[grantWeeklyPlacementPoints]', (e as any)?.message || e);
        return Response.json({ ok: false, error: String((e as any)?.message || e) }, { status: 500 });
    }
});
