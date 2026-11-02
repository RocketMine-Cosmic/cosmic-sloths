import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { currentWeekId } from '../../shared/treasuryBuff.ts';

// AUTOMATIC PAYOUTS — one step per call (added 21 Oct 2026, Rob: "fully hands off").
//
// Replaces the old automatic job (distributeRewards, K-B1), which must stay off. This job does no
// payout maths of its own: each step calls the SAME function the admin payout button calls
// (manuallyDistributeRewards / distributeKillPool / distributeStaffPayout / distributeSquadChampions),
// so the amounts, the log-first PayoutLog rows and the per-wallet "already paid" skip are the ones
// Rob has paid with by hand for months. What this file adds is everything around the button press:
//
//   - It only ever pays the week that CLOSED last Sunday (and, on a season-end Monday, that season).
//   - Steps run in order, 20 minutes apart (workflows "Auto payout — 1 … 5"), and a step refuses to
//     run unless the one before it finished ok/skipped for the same period.
//   - A PayoutRun row keyed <period>:<step> (unique) is the lock: a step can start once per period.
//     A second call finds the row and does nothing.
//   - Before paying it stops (status 'stopped', nothing paid) if: any payout anywhere is still
//     "maybe paid" (pending-); the period has 0 or 2+ pool rows; the period is already partly paid;
//     the preview asks for more than the pool or more than the per-player cap; or the staff share
//     isn't 0. After paying it re-runs the preview and stops unless every owed wallet is now paid.
//   - A stopped step blocks every later step until Rob has looked (run-book §3.4).
//
// AppConfig 'auto_payout' = { enabled, live }. enabled false → the workflows do nothing. live false →
// dry runs (status 'dry': what it WOULD pay, nothing sent). Admin callers may pass
// { step, period?, dryRun? }: period overrides the default (for a re-run or a dry run on an old week);
// the current week/season is always refused.
//
// Plan and  reasons: project doc claude/handoffs/AUTO_PAYOUTS.md. Monday report: the Reports tab.

const STEPS = ['weekly_score', 'weekly_kills', 'close_week', 'seasonal', 'champions'];
const PREVIOUS: Record<string, string | null> = {
    weekly_score: null, weekly_kills: 'weekly_score', close_week: 'weekly_kills',
    seasonal: 'close_week', champions: 'seasonal',
};
const MAX_PER_PLAYER = 10000; // same cap the payout functions apply

async function isAdminCaller(base44: any, body: any) {
    const key = body?.adminKey || body?.args?.adminKey;
    if (key && key === Deno.env.get('AdminDash')) return true;
    try { const me = await base44.auth.me(); return me?.role === 'admin'; } catch { return false; }
}

function weekParts(weekId: string) {
    const [y, w] = weekId.split('-W').map(Number);
    return { y, w };
}
function weekBefore(weekId: string, n: number) {
    const { y, w } = weekParts(weekId);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7 - n * 7);
    return currentWeekId(monday);
}
function seasonOfWeek(weekId: string) {
    const { y, w } = weekParts(weekId);
    return `${y}-S${Math.floor((w - 1) / 4) + 1}`;
}
function yearHas53Weeks(y: number) {
    return currentWeekId(new Date(Date.UTC(y, 11, 28))).endsWith('-W53');
}

async function invoke(base44: any, fn: string, body: any) {
    try {
        const res = await base44.asServiceRole.functions.invoke(fn, { ...body, adminKey: Deno.env.get('AdminDash') });
        return { ok: true, status: res?.status || 200, data: res?.data };
    } catch (e: any) {
        return { ok: false, status: e?.response?.status || 0, data: e?.response?.data, error: e?.message || String(e) };
    }
}

// T-002 (2 Nov 2026): the paying steps pay ONE rank band per call (so no call nears Base44's 120 s edge,
// which killed W43's kill payout), and a band whose Omen answer never came is re-sent with the SAME batch
// and key a little later — Omen answers that with the original result, never a second payment (checked
// in Omen's SDK 2.4.0 docs; see shared/grantBatch.ts). Only if Omen still can't say after a few tries
// does the step stop for Rob, exactly as before.
const STEP_BUDGET_MS = 240_000;   // the whole step, kept clear of the workflow's 5-minute limit
const REPLAY_WAIT_MS = 40_000;    // let Omen finish the slow one before asking again
const REPLAY_TRIES = 4;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Pays one paying step band by band. Returns the last answer plus a short log of what happened.
async function payBandByBand(base44: any, db: any, fn: string, args: any, periodType: string, started: number) {
    const deadline = started + STEP_BUDGET_MS;
    const log: any[] = [];
    let answer: any = null;
    for (let call = 0; call < 12; call++) {
        answer = await invoke(base44, fn, { ...args, one_band: true });
        let marker = answer.data?.unclear_band?.marker || '';
        if (!answer.ok && !marker) {
            // The call itself failed (e.g. cut at the edge). If it left exactly one band "maybe paid" for this
            // period, that is the band to settle; anything else is for Rob.
            const rows = await db.entities.PayoutLog.filter({ period_id: args.period_id, period_type: periodType, tx_id: { $regex: '^pending-' } }, '-created_date', 50);
            const markers = [...new Set((rows || []).map((r: any) => r.tx_id))];
            if (markers.length === 1) marker = markers[0] as string;
        }
        log.push({ call: call + 1, band: answer.data?.tier_paid || answer.data?.unclear_band?.label || '', ok: answer.ok, has_more: !!answer.data?.has_more, unclear: marker || undefined, status: answer.status });
        if (marker) {
            let resolved = false;
            for (let t = 1; t <= REPLAY_TRIES; t++) {
                if (Date.now() + REPLAY_WAIT_MS + 60_000 > deadline) { log.push({ replay: t, skipped: 'out of time for this step' }); break; }
                await sleep(REPLAY_WAIT_MS);
                const r = await invoke(base44, fn, { ...args, replay_marker: marker });
                log.push({ replay: t, resolved: !!r.data?.resolved, replayed: r.data?.replayed, tx_id: r.data?.tx_id, reason: r.data?.reason || r.error || '' });
                if (r.data?.resolved) { resolved = true; break; }
                if (r.data?.final) break;
            }
            if (!resolved) return { answer: { ...answer, ok: false }, log };
            continue; // band settled — carry on with the next one
        }
        if (!answer.ok || !answer.data?.has_more) break;
        if (Date.now() + 60_000 > deadline) { log.push({ stopped: 'out of time for this step; bands left' }); return { answer: { ...answer, ok: false }, log }; }
    }
    return { answer, log };
}

async function pendingAnywhere(db: any) {
    const p = await db.entities.PayoutLog.filter({ tx_id: { $regex: '^pending-' } }, '-created_date', 20);
    const c = await db.entities.SquadChampionsPayoutLog.filter({ status: 'pending' }, '-created_date', 20);
    return [
        ...(p || []).map((r: any) => `${r.period_id} ${r.period_type} rank ${r.rank} ${r.amount}`),
        ...(c || []).map((r: any) => `${r.period_id} champions ${r.squad_tag || ''} ${r.amount}`),
    ];
}

// What a step owes, from the same preview the admin panel shows.
async function previewFor(base44: any, step: string, period: string) {
    if (step === 'champions') {
        const r = await invoke(base44, 'distributeSquadChampions', { mode: 'preview', period_id: period });
        if (!r.ok || !r.data?.success) return { error: `champions preview failed: ${r.error || JSON.stringify(r.data).slice(0, 300)}` };
        const list = (r.data.member_payments || []).map((p: any) => ({ wallet: p.wallet_address, amount: p.amount, rank: p.squad_rank, already_paid: !!p.already_paid }));
        return { list, pool: Number(r.data.champions_pool_omenx || 0), total_spent: Number(r.data.pool_total_spent || 0), cap: 100 };
    }
    const period_type = step === 'seasonal' ? 'seasonal' : 'weekly';
    const r = await invoke(base44, 'previewPayouts', { period_id: period, period_type });
    if (!r.ok || r.data?.error) return { error: `preview failed: ${r.error || r.data?.error}` };
    const d = r.data;
    const pick = step === 'weekly_kills' ? d.kill_payments : step === 'close_week' ? d.staff_payments : d.payments;
    const pool = step === 'weekly_kills' ? d.kill_reward_pool : step === 'close_week' ? Infinity : d.reward_pool;
    const list = (pick || []).map((p: any) => ({ wallet: p.wallet_address, amount: p.amount, rank: p.rank || 0, name: p.player_name, already_paid: !!p.already_paid }));
    return { list, pool: Number(pool || 0), total_spent: Number(d.total_spent || 0), cap: 20, distributed: !!d.distributed };
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const args = body?.args || body || {};
    if (!(await isAdminCaller(base44, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const db = base44.asServiceRole;

    const step = String(args.step || '');
    if (!STEPS.includes(step)) return Response.json({ error: `step must be one of ${STEPS.join(', ')}` }, { status: 400 });

    let cfg: any = {};
    try { cfg = (await db.entities.AppConfig.filter({ key: 'auto_payout' }))?.[0]?.value || {}; } catch {}
    const explicitDry = args.dryRun === true;
    const scheduled = !args.period && !explicitDry && !args.force;
    if (scheduled && cfg.enabled !== true) return Response.json({ ok: true, step, skipped: 'auto_payout is switched off' });
    const dry = explicitDry || cfg.live !== true;

    // Which period. Default: the week that closed last Sunday, and its season on a season-end Monday.
    const thisWeek = currentWeekId();
    const closedWeek = args.period && /-W\d+$/.test(args.period) ? String(args.period) : weekBefore(thisWeek, 1);
    const isSeasonStep = step === 'seasonal' || step === 'champions';
    const { y: cy, w: cw } = weekParts(closedWeek);
    const seasonEnd = cw === 53 || (cw % 4 === 0 && !(cw === 52 && yearHas53Weeks(cy)));
    const period = isSeasonStep
        ? (args.period && /-S\d+$/.test(args.period) ? String(args.period) : seasonOfWeek(closedWeek))
        : closedWeek;

    const runKey = dry ? `dry:${period}:${step}:${Date.now()}` : `${period}:${step}`;
    const started = new Date().toISOString();
    const record = async (status: string, extra: any = {}) => {
        const row = { run_key: runKey, period_id: period, step, mode: dry ? 'dry' : 'live', status, finished_at: status === 'running' ? '' : new Date().toISOString(), ...extra };
        return row;
    };

    // ---- Season steps only on a season-end Monday (unless a season was named) ----
    // This MUST come before the lock (T-002, 2 Nov 2026). It used to sit after the lock and after the
    // open-period check, so on every ordinary Monday the season steps finished 'stopped' ("has not closed
    // yet") under the run_key <season>:<step> — and that row then blocked the REAL season payout on the
    // season-end Monday (S11 seasonal + champions silently did nothing on 2 Nov). A season step that is
    // not due this week is recorded under the WEEK (<closed week>:<step>), never under the season, so it
    // can never lock the season's own run.
    if (isSeasonStep && !(args.period && /-S\d+$/.test(args.period))) {
        let notDue: { status: string, reason: string } | null = null;
        if (cw === 52 && yearHas53Weeks(cy)) {
            notDue = { status: 'skipped', reason: `week 52 of a 53-week year: ${period} runs on into week 53 (Rob, 21 Oct: W53 joins S13), so it is paid the following Monday` };
        } else if (cw === 53) {
            notDue = { status: 'stopped', reason: `week 53 closed: the season that includes it must be paid as a 5-week season, which is not built yet (K-C1) — pay it by hand` };
        } else if (!seasonEnd) {
            notDue = { status: 'skipped', reason: `${closedWeek} is not the last week of a season` };
        }
        if (notDue) {
            const row = { run_key: dry ? `dry:${closedWeek}:${step}:${Date.now()}` : `${closedWeek}:${step}`, period_id: closedWeek, step,
                mode: dry ? 'dry' : 'live', status: notDue.status, finished_at: new Date().toISOString(), reason: notDue.reason };
            try { await db.entities.PayoutRun.create(row); } catch { /* already recorded for this week — fine */ }
            const log = `[autoPayoutStep] ${dry ? 'DRY ' : ''}${closedWeek} ${step}: ${notDue.status} — ${notDue.reason}`;
            if (notDue.status === 'stopped') console.error(log); else console.log(log);
            return Response.json({ ok: notDue.status !== 'stopped', step, period: closedWeek, season: period, mode: dry ? 'dry' : 'live',
                status: notDue.status, reason: notDue.reason, lock_written: false });
        }
    }

    // ---- Lock / already done (live only) ----
    let runRow: any = null;
    if (!dry) {
        const existing = (await db.entities.PayoutRun.filter({ run_key: runKey }))?.[0];
        if (existing) {
            return Response.json({ ok: true, step, period, already: existing.status, note: 'this step already has a run for this period; nothing done' });
        }
        try {
            runRow = await db.entities.PayoutRun.create(await record('running', { reason: `started ${started}` }));
        } catch (e) {
            return Response.json({ ok: true, step, period, note: 'another run of this step started at the same moment; nothing done' });
        }
    }
    const finish = async (status: string, extra: any = {}) => {
        const row = await record(status, extra);
        try {
            if (runRow) await db.entities.PayoutRun.update(runRow.id, row);
            else await db.entities.PayoutRun.create(row);
        } catch (e) { console.error('[autoPayoutStep] could not write PayoutRun', (e as any)?.message); }
        const log = `[autoPayoutStep] ${dry ? 'DRY ' : ''}${period} ${step}: ${status}${extra.reason ? ' — ' + extra.reason : ''}`;
        if (status === 'stopped') console.error(log); else console.log(log);
        return Response.json({ ok: status !== 'stopped', step, period, mode: dry ? 'dry' : 'live', status, ...extra });
    };

    try {
        // ---- Never the open period ----
        const thisSeason = seasonOfWeek(thisWeek);
        if ((!isSeasonStep && period >= thisWeek) || (isSeasonStep && period === thisSeason)) {
            return await finish('stopped', { reason: `${period} has not closed yet — refusing to pay an open period` });
        }

        // (The "is this a season-end Monday?" check is above the lock — see T-002 there.)

        // ---- Order: the step before must be done for this period (live only) ----
        const prev = PREVIOUS[step];
        if (prev && !dry) {
            const prevPeriod = (step === 'seasonal') ? closedWeek : period; // seasonal follows the closed week's close_week
            const prevRow = (await db.entities.PayoutRun.filter({ run_key: `${prevPeriod}:${prev}` }))?.[0];
            if (!prevRow || !['ok', 'skipped'].includes(prevRow.status)) {
                return await finish('stopped', { reason: `the step before (${prev} for ${prevPeriod}) has not finished cleanly (${prevRow ? prevRow.status : 'never ran'})` });
            }
        }

        // ---- Nothing may be "maybe paid" anywhere ----
        const pend = await pendingAnywhere(db);
        if (pend.length) return await finish('stopped', { reason: `payouts still marked "maybe paid" — check them on Omen first (run-book 5.2): ${pend.join('; ')}` });

        // ---- Exactly one pool row ----
        const poolType = isSeasonStep ? 'seasonal' : 'weekly';
        const pools = await db.entities.TokenPool.filter({ period_id: period, period_type: poolType });
        if (!pools || pools.length === 0) return await finish('skipped', { reason: `no ${poolType} pool for ${period} (nobody spent)` });
        if (pools.length > 1) return await finish('stopped', { reason: `${pools.length} ${poolType} pool rows for ${period} — merge them by hand first` });

        // ---- What is owed ----
        const pv: any = await previewFor(base44, step, period);
        if (pv.error) return await finish('stopped', { reason: pv.error });
        const owed = pv.list.filter((p: any) => !p.already_paid);
        const paidBefore = pv.list.length - owed.length;
        const owedTotal = owed.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        const base = { to_pay_count: owed.length, to_pay_total: owedTotal, pool_total_spent: pv.total_spent, details: { preview: pv.list } };

        if (step === 'close_week') {
            if (pv.list.length > 0) return await finish('stopped', { ...base, reason: `the staff share is not 0 (${pv.list.length} staff payments, ${owedTotal} OMCADE) — staff pay is meant to be 0; check AppConfig staff_pct_per_wallet` });
            if (pv.distributed) return await finish('skipped', { ...base, reason: `${period} is already marked paid` });
        } else {
            if (pv.list.length === 0) return await finish('skipped', { ...base, reason: 'nobody is owed anything (empty board or zero pool)' });
            if (owed.length === 0) return await finish('skipped', { ...base, reason: `already paid (${paidBefore} wallets), probably by hand` });
            if (paidBefore > 0) return await finish('stopped', { ...base, reason: `${period} is already PARTLY paid (${paidBefore} paid, ${owed.length} not) — finish it by hand from the admin panel` });
            const big = owed.find((p: any) => Number(p.amount) > MAX_PER_PLAYER || Number(p.amount) < 1);
            if (big) return await finish('stopped', { ...base, reason: `an amount is out of range (${big.amount} to ${big.wallet})` });
            if (owedTotal > pv.pool) return await finish('stopped', { ...base, reason: `the payout (${owedTotal}) is more than the pool (${pv.pool})` });
            if (owed.length > pv.cap) return await finish('stopped', { ...base, reason: `${owed.length} wallets, more than the ${pv.cap} expected` });
        }

        if (dry) return await finish('dry', { ...base, reason: step === 'close_week' ? `would mark ${period} as paid` : `would pay ${owed.length} wallets ${owedTotal} OMCADE` });

        // ---- Pay, by pressing the same button Rob presses (one rank band per press — T-002) ----
        let answer: any;
        let bandLog: any[] | undefined;
        if (step === 'weekly_score' || step === 'seasonal') {
            const period_type = step === 'seasonal' ? 'seasonal' : 'weekly';
            const r = await payBandByBand(base44, db, 'manuallyDistributeRewards', { period_id: period, period_type }, period_type, Date.parse(started));
            answer = r.answer; bandLog = r.log;
        } else if (step === 'weekly_kills') {
            const r = await payBandByBand(base44, db, 'distributeKillPool', { period_id: period }, 'weekly_kills', Date.parse(started));
            answer = r.answer; bandLog = r.log;
        } else if (step === 'close_week') {
            answer = await invoke(base44, 'distributeStaffPayout', { period_id: period });
        } else {
            answer = await invoke(base44, 'distributeSquadChampions', { mode: 'execute', period_id: period });
        }
        const answerDetail = { status: answer.status, data: answer.data, error: answer.error, bands: bandLog };

        // ---- Verify against the books, not against the answer ----
        const pend2 = await pendingAnywhere(db);
        if (pend2.length) return await finish('stopped', { ...base, details: { ...base.details, answer: answerDetail }, reason: `Omen gave an unclear answer; ${pend2.length} payouts are "maybe paid" — check them on Omen (run-book 5.2)` });
        if (step === 'close_week') {
            const pool = (await db.entities.TokenPool.filter({ period_id: period, period_type: 'weekly' }))?.[0];
            if (!pool?.distributed) return await finish('stopped', { ...base, details: { ...base.details, answer: answerDetail }, reason: `pressed "Staff Only" but ${period} is still not marked paid` });
            return await finish('ok', { ...base, paid_count: 0, paid_total: 0, details: { ...base.details, answer: answerDetail }, reason: `${period} marked paid` });
        }
        const pv2: any = await previewFor(base44, step, period);
        if (pv2.error) return await finish('stopped', { ...base, details: { ...base.details, answer: answerDetail }, reason: `paid, but the check afterwards failed: ${pv2.error}` });
        const stillOwed = pv2.list.filter((p: any) => !p.already_paid);
        const paidNow = owed.filter((p: any) => !stillOwed.find((s: any) => s.wallet.toLowerCase() === p.wallet.toLowerCase()));
        const paidTotal = paidNow.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        if (stillOwed.length > 0 || !answer.ok) {
            return await finish('stopped', { ...base, paid_count: paidNow.length, paid_total: paidTotal, details: { ...base.details, answer: answerDetail },
                reason: `${paidNow.length} paid, ${stillOwed.length} still owed${answer.ok ? '' : ` (the payout function said: ${answer.error || JSON.stringify(answer.data).slice(0, 200)})`}` });
        }
        return await finish('ok', { ...base, paid_count: paidNow.length, paid_total: paidTotal, details: { ...base.details, answer: answerDetail }, reason: `paid ${paidNow.length} wallets ${paidTotal} OMCADE` });
    } catch (e) {
        return await finish('stopped', { reason: `crashed: ${(e as any)?.message || e}` });
    }
});
