import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { loadPointsConfig, pointsSummary } from '../../shared/omenxPoints.ts';

// Star Ops points strip: is the feature on, what each card pays (for the "+N AP" badges), and what
// this player has earned today / this month. Read-only. Plan: project doc
// claude/handoffs/ACTIVITY_POINTS.md.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let me = null;
        try { me = await base44.auth.me(); } catch {}
        const db = base44.asServiceRole;
        const cfg = await loadPointsConfig(db);
        const a = cfg.amounts;
        const amounts = {
            login: a.login, bounties: a.bounties, tasks: a.tasks, mission: a.mission,
            streak: { 3: a.streak3, 7: a.streak7, 14: a.streak14, 30: a.streak30 },
            wscore: a.wscore, wkills: a.wkills, // [1st, 2nd, 3rd, 4th-10th] for the leaderboard pills
        };
        // Admins see the strip and badges even while points are off, so the screen can be checked
        // before switching on (labelled as a preview in the UI).
        const preview = !cfg.enabled && me?.role === 'admin';
        if (!cfg.enabled && !preview) return Response.json({ enabled: false, amounts });
        if (!me?.wallet_address) return Response.json({ enabled: cfg.enabled, preview, amounts, today: 0, month: 0, earnedToday: [] });
        const s = await pointsSummary(db, me.wallet_address);
        return Response.json({ enabled: cfg.enabled, preview, amounts, ...s });
    } catch (e) {
        console.warn('[getMyActivityPoints]', (e as any)?.message || e);
        return Response.json({ enabled: false });
    }
});
