import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { currentWeekId } from '../../shared/treasuryBuff.ts';
import { batchIdempotencyKey, sendGrantBatch, replayPendingBand } from '../../shared/grantBatch.ts';

// ONE-CLICK DRY-RUN SCORECARD for the automatic payouts (autoPayoutStep). Admin only.
// Every case is a DRY run: nothing is sent to Omen and no live PayoutRun lock is taken.
// Cases: every step against a week/season already paid (must pay nobody), the open week (must
// refuse), and a planted "maybe paid" row (must stop) — the planted row is labelled and removed
// before this returns. Each case says what was expected and what happened.
//
// T-002 cases (2 Nov 2026): the season steps on an ORDINARY Monday are 'skipped' and write no lock under
// the season; on a season-end Monday they are not refused as "open"; and an Omen answer that comes too late
// is settled by re-sending the identical batch + key (a FAKE Omen inside this function — nothing is sent).

async function isAdminCaller(base44: any, body: any) {
    const key = body?.adminKey || body?.args?.adminKey;
    if (key && key === Deno.env.get('AdminDash')) return true;
    try { const me = await base44.auth.me(); return me?.role === 'admin'; } catch { return false; }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!(await isAdminCaller(base44, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const db = base44.asServiceRole;
    const paidWeek = body.paidWeek || '2026-W42';
    const paidSeason = body.paidSeason || '2026-S10';
    const openWeek = currentWeekId();

    const run = async (args: any) => {
        try {
            const r = await db.functions.invoke('autoPayoutStep', { ...args, dryRun: true, adminKey: Deno.env.get('AdminDash') });
            return r?.data || {};
        } catch (e: any) {
            return e?.response?.data || { status: 'error', reason: e?.message };
        }
    };
    const cases: any[] = [];
    const check = async (name: string, args: any, expect: string[]) => {
        const r = await run(args);
        cases.push({ case: name, expected: expect.join(' or '), got: r.status || 'error', pass: expect.includes(r.status), reason: r.reason || r.error || '', would_pay: r.to_pay_total ?? null });
    };

    await check(`weekly score, ${paidWeek} (already paid)`, { step: 'weekly_score', period: paidWeek }, ['skipped']);
    await check(`weekly kills, ${paidWeek} (already paid)`, { step: 'weekly_kills', period: paidWeek }, ['skipped']);
    await check(`close week, ${paidWeek} (already closed)`, { step: 'close_week', period: paidWeek }, ['skipped']);
    await check(`seasonal, ${paidSeason} (already paid)`, { step: 'seasonal', period: paidSeason }, ['skipped']);
    await check(`squad champions, ${paidSeason} (already paid)`, { step: 'champions', period: paidSeason }, ['skipped']);
    await check(`weekly score, ${openWeek} (still open)`, { step: 'weekly_score', period: openWeek }, ['stopped']);

    // Planted "maybe paid" row: the job must stop before paying anything.
    let planted: any = null;
    try {
        planted = await db.entities.PayoutLog.create({
            period_id: 'TEST-autoPayout', period_type: 'test', wallet_address: '0x000000000000000000000000000000000000dead',
            player_name: 'testAutoPayout planted row (deleted automatically)', amount: 0, rank: 0,
            tx_id: `pending-TEST-autoPayout-${Date.now()}`,
        });
        await check(`a "maybe paid" row exists`, { step: 'weekly_score', period: paidWeek }, ['stopped']);
    } finally {
        if (planted) { try { await db.entities.PayoutLog.delete(planted.id); } catch {} }
    }

    // ---- T-002, bug 2: season steps on an ordinary Monday must skip, and never lock the season ----
    const ordinaryWeek = body.ordinaryWeek || '2026-W45';      // S12's 1st week: closes Sun 8 Nov
    const seasonEndWeek = body.seasonEndWeek || '2026-W44';    // S11's last week
    const seasonOf = (w: string) => { const [y, n] = w.split('-W').map(Number); return `${y}-S${Math.floor((n - 1) / 4) + 1}`; };
    for (const step of ['seasonal', 'champions']) {
        const r = await run({ step, period: ordinaryWeek });
        const lock = (await db.entities.PayoutRun.filter({ run_key: `${seasonOf(ordinaryWeek)}:${step}` }))?.[0];
        const pass = r.status === 'skipped' && r.lock_written === false && !lock;
        cases.push({ case: `${step} on an ordinary Monday (${ordinaryWeek} closed)`, expected: `skipped, no ${seasonOf(ordinaryWeek)}:${step} lock`, got: `${r.status || 'error'}${lock ? ` + LOCK ROW ${lock.status}` : ''}`, pass, reason: r.reason || r.error || '', would_pay: null });
    }
    for (const step of ['seasonal', 'champions']) {
        const r = await run({ step, period: seasonEndWeek });
        const pass = !!r.status && !/has not closed yet/.test(r.reason || '') && r.status !== 'error';
        cases.push({ case: `${step} on a season-end Monday (${seasonEndWeek} closed → ${seasonOf(seasonEndWeek)})`, expected: 'not refused as an open period (dry / skipped)', got: r.status || 'error', pass, reason: r.reason || r.error || '', would_pay: r.to_pay_total ?? null });
    }

    // ---- T-002, bug 1: a late Omen answer is settled by an identical replay (FAKE Omen, nothing sent) ----
    {
        const tp = 'TEST-T002';
        const marker = `pending-${tp}-${Date.now()}-kills-r4-10`;
        const band = [
            { walletAddress: '0x000000000000000000000000000000000000dEaD', amount: 7, rank: 4 },
            { walletAddress: '0x000000000000000000000000000000000000bEEF', amount: 5, rank: 5 },
        ];
        const made: string[] = [];
        const bodies: string[] = [];
        try {
            for (const p of band) {
                const row = await db.entities.PayoutLog.create({ period_id: tp, period_type: 'weekly_kills', wallet_address: p.walletAddress,
                    player_name: 'testAutoPayout T-002 planted row (deleted automatically)', amount: p.amount, rank: p.rank, tx_id: marker });
                made.push(row.id);
            }
            const note = `Cosmic Sloths weekly KILL payout ${tp} — Ranks #4–10`;
            // 1) Omen answers after 4 s; this send gives up at 1 s.
            const slowOmen: typeof fetch = (_u: any, init: any) => { bodies.push(init.body); return new Promise((res, rej) => {
                const t = setTimeout(() => res(new Response('{}', { status: 201 })), 4000);
                init.signal.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('aborted', 'AbortError')); });
            }); };
            const first = await sendGrantBatch({ apiBaseUrl: 'https://fake.invalid', apiKey: 'fake', gameId: 'cosmic-sloths', gameName: 'Cosmic Sloths', note,
                payments: band, idempotencyKey: await batchIdempotencyKey(`cs-weekly_kills-${tp}-r4-10`, band), timeoutMs: 1000, fetchImpl: slowOmen });
            // 2) The replay: Omen answers with the ORIGINAL result.
            const replayOmen: typeof fetch = async (_u: any, init: any) => { bodies.push(init.body);
                return new Response(JSON.stringify({ success: true, transactionId: '0xT002-original', replayed: true }), { status: 200 }); };
            const rep = await replayPendingBand(db, { period_id: tp, period_type: 'weekly_kills', marker, apiBaseUrl: 'https://fake.invalid', apiKey: 'fake',
                gameId: 'cosmic-sloths', gameName: 'Cosmic Sloths', noteFor: () => note, fetchImpl: replayOmen });
            const after = await db.entities.PayoutLog.filter({ period_id: tp }, 'rank', 10);
            const settled = (after || []).length === 2 && after.every((r: any) => r.tx_id === '0xT002-original');
            const same = bodies.length === 2 && bodies[0] === bodies[1];
            const pass = first.outcome === 'unclear' && rep.resolved === true && settled && same;
            cases.push({ case: 'late Omen answer → band settled by replay (fake Omen)', expected: 'first send unclear, replay identical, both rows get the original tx',
                got: `first ${first.outcome}/${first.code}; replay ${rep.resolved ? 'resolved' : 'NOT resolved'}; identical body ${same}; rows settled ${settled}`, pass, reason: rep.reason || '', would_pay: null });
        } finally {
            const left = await db.entities.PayoutLog.filter({ period_id: tp }, '-created_date', 20).catch(() => []);
            for (const r of [...made.map(id => ({ id })), ...(left || [])]) { try { await db.entities.PayoutLog.delete(r.id); } catch {} }
        }
    }

    // Tidy: dry-run rows from this scorecard are not part of the record.
    try {
        const dryRows = await db.entities.PayoutRun.filter({ mode: 'dry' }, '-created_date', 100);
        const since = Date.now() - 5 * 60000;
        for (const r of dryRows || []) if (new Date(r.created_date).getTime() > since) { try { await db.entities.PayoutRun.delete(r.id); } catch {} }
    } catch {}

    const passed = cases.filter(c => c.pass).length;
    return Response.json({
        verdict: passed === cases.length ? `ALL ${passed} PASSED` : `${cases.length - passed} of ${cases.length} FAILED`,
        cases,
        next_monday: `${openWeek} closes Sunday 23:59 UTC; the first automatic payout would pay it from Monday 10:40 UTC, if auto_payout is switched on and live.`,
    });
});
