import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { grantSafely, pointsSummary, loadPointsConfig, dailyKey } from '../../shared/omenxPoints.ts';
import { claimDailyTaskFor } from '../../shared/claims.ts';

// Server-authoritative Daily Task claim. Tasks live on save_data.dailyTasks = { date, tasks: [{id, progress, target, claimed}] };
// progress is updated in saveScore. The reward and the task's "claimed" flag are written in ONE atomic database step
// (shared/claims.ts) — a run saving at the same moment can't undo it, and a double tap pays once.
// Save-write fix stage 3a (claude/handoffs/SAVE_WRITES.md, 21 Oct 2026).

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let me: any = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Please sign in to claim your task.' }, { status: 401 });
        const wallet = me.wallet_address;
        if (!wallet) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { taskId } = await req.json();
        if (!taskId) return Response.json({ error: 'Couldn\'t process this claim — please refresh and try again.' }, { status: 400 });

        const walletLower = wallet.toLowerCase();
        const db = base44.asServiceRole;
        const result = await claimDailyTaskFor(db, walletLower, String(taskId));
        if (result.status !== 200) return Response.json(result.body, { status: result.status });

        // Omen activity points (a bonus; never fails the claim): the claim that completes ALL of today's tasks = 10, once per UTC day.
        let activityPoints = null;
        try {
            const cfg = await loadPointsConfig(db);
            if (cfg.enabled) {
                const todayUTC = new Date().toISOString().split('T')[0];
                const tasks = result.fresh?.dailyTasks?.tasks || [];
                const grants = (tasks.length > 0 && tasks.every((t: any) => t && t.claimed))
                    ? [{ wallet: walletLower, event: 'tasks', amount: cfg.amounts.tasks, idempotencyKey: dailyKey('tasks', todayUTC, walletLower), dayKey: todayUTC }]
                    : [];
                const results = await grantSafely(db, grants);
                activityPoints = { earned: results.filter(r => r.outcome === 'granted' && !r.already).map(r => ({ event: r.event, amount: r.credited })), ...(await pointsSummary(db, walletLower)) };
            }
        } catch (e) {
            console.warn('[claimDailyTask] activity points skipped:', (e as any)?.message);
        }
        return Response.json({ ...result.body, activityPoints });
    } catch (error) {
        console.error('[claimDailyTask]', (error as any)?.message);
        return Response.json({ error: 'Couldn\'t claim your task right now. Please try again.' }, { status: 500 });
    }
});
