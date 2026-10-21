import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { grantSafely, pointsSummary, loadPointsConfig, dailyKey, daysBefore, STREAK_MILESTONES } from '../../shared/omenxPoints.ts';
import { claimDailyLoginFor } from '../../shared/dailyLogin.ts';

// Server-authoritative daily login claim. The reward and the "claimed today" marker are written in ONE atomic
// database step (shared/dailyLogin.ts), so a run saving at the same moment can't undo the reward, the reward
// can't undo the run, and a double tap can't pay twice. Stage 2 of claude/handoffs/SAVE_WRITES.md (21 Oct 2026).
// SDK 0.8.55: updateMany needs it.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // base44.auth.me() THROWS when there's no auth context — catch it for a clean 401.
        let me = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Please sign in to claim your daily reward.' }, { status: 401 });

        const wallet = me.wallet_address;
        if (!wallet) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const db = base44.asServiceRole;
        const result = await claimDailyLoginFor(db, wallet.toLowerCase());
        if (result.status !== 200) return Response.json(result.body, { status: result.status });

        // Omen activity points (a bonus; never fails the claim). Login 10, plus a streak milestone
        // once per unbroken streak (keyed by the day the streak started).
        let activityPoints = null;
        try {
            const walletLower = result.wallet!;
            const today = result.today!;
            const newStreak = result.newStreak!;
            const cfg = await loadPointsConfig(db);
            if (cfg.enabled) {
                const grants = [{ wallet: walletLower, event: 'login', amount: cfg.amounts.login, idempotencyKey: dailyKey('login', today, walletLower), dayKey: today }];
                if (STREAK_MILESTONES.includes(newStreak)) {
                    const ev = `streak${newStreak}`;
                    const start = daysBefore(today, newStreak - 1);
                    grants.push({ wallet: walletLower, event: ev, amount: cfg.amounts[ev], idempotencyKey: `ap-${ev}-${start}-${walletLower}`, dayKey: today });
                }
                const results = await grantSafely(db, grants);
                activityPoints = { earned: results.filter(r => r.outcome === 'granted' && !r.already).map(r => ({ event: r.event, amount: r.credited })), ...(await pointsSummary(db, walletLower)) };
            }
        } catch (e) {
            console.warn('[claimDailyLogin] activity points skipped:', e?.message);
        }

        return Response.json({ ...result.body, activityPoints });
    } catch (error) {
        console.error('[claimDailyLogin]', error.message);
        return Response.json({ error: 'Couldn\'t claim your daily reward right now. Please try again.' }, { status: 500 });
    }
});
