import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { currentWeekId } from '../../shared/treasuryBuff.ts';

// ONE-CLICK DRY-RUN SCORECARD for the automatic payouts (autoPayoutStep). Admin only.
// Every case is a DRY run: nothing is sent to Omen and no live PayoutRun lock is taken.
// Cases: every step against a week/season already paid (must pay nobody), the open week (must
// refuse), and a planted "maybe paid" row (must stop) — the planted row is labelled and removed
// before this returns. Each case says what was expected and what happened.

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

    // What next Monday would do (for the eyes, not pass/fail).
    const preview = await run({ step: 'weekly_score' });
    const previewKills = await run({ step: 'weekly_kills' });

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
        next_monday: {
            weekly_score: { status: preview.status, period: preview.period, reason: preview.reason, would_pay: preview.to_pay_total },
            weekly_kills: { status: previewKills.status, period: previewKills.period, reason: previewKills.reason, would_pay: previewKills.to_pay_total },
            note: 'Monday\'s week is still open, so these say "stopped: has not closed yet" until Monday 00:00 UTC. That is correct.',
        },
    });
});
