import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { grantSafely, pointsSummary, loadPointsConfig, dailyKey, utcDay } from '../../shared/omenxPoints.ts';
import { claimBountyFor } from '../../shared/claims.ts';

// Server-authoritative bounty / daily-mission claim. The reward and the bounty's "claimed" flag are written in ONE
// atomic database step (shared/claims.ts), guarded on the same bounty, same day's list, not yet claimed.
// Save-write fix stage 3a (claude/handoffs/SAVE_WRITES.md, 21 Oct 2026).

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let me: any = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Please sign in to claim your bounty.' }, { status: 401 });
        const wallet = me.wallet_address;
        if (!wallet) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { type, bountyIndex, is_sandbox } = await req.json();
        if (!type || (type !== 'bounty' && type !== 'dailyMission')) {
            return Response.json({ error: 'Couldn\'t process this claim — please refresh and try again.' }, { status: 400 });
        }
        // S8 Sandbox — practice runs never write bounty progress; guard a hand-made POST anyway.
        if (is_sandbox === true) return Response.json({ success: false, sandbox: true });
        if (type === 'bounty' && (bountyIndex === undefined || bountyIndex < 0 || bountyIndex > 2 || !Number.isInteger(Number(bountyIndex)))) {
            return Response.json({ error: 'Couldn\'t process this claim — please refresh and try again.' }, { status: 400 });
        }

        const walletLower = wallet.toLowerCase();
        const db = base44.asServiceRole;
        const result = await claimBountyFor(db, walletLower, type, type === 'bounty' ? Number(bountyIndex) : undefined);
        if (result.status !== 200) return Response.json(result.body, { status: result.status });

        // Omen activity points (a bonus; never fails the claim): Daily Mission = 5; the claim that completes all 3
        // Daily Bounties = 10. One of each per UTC day.
        let activityPoints = null;
        try {
            const cfg = await loadPointsConfig(db);
            if (cfg.enabled) {
                const day = utcDay();
                const grants: any[] = [];
                if (type === 'dailyMission') {
                    grants.push({ wallet: walletLower, event: 'mission', amount: cfg.amounts.mission, idempotencyKey: dailyKey('mission', day, walletLower), dayKey: day });
                } else {
                    const list = result.fresh?.bounties?.active || [];
                    if (list.length >= 3 && list.every((b: any) => b && b.claimed)) {
                        grants.push({ wallet: walletLower, event: 'bounties', amount: cfg.amounts.bounties, idempotencyKey: dailyKey('bounties', day, walletLower), dayKey: day });
                    }
                }
                const results = await grantSafely(db, grants);
                activityPoints = { earned: results.filter(r => r.outcome === 'granted' && !r.already).map(r => ({ event: r.event, amount: r.credited })), ...(await pointsSummary(db, walletLower)) };
            }
        } catch (e) {
            console.warn('[claimBounty] activity points skipped:', (e as any)?.message);
        }
        return Response.json({ ...result.body, activityPoints });
    } catch (error) {
        console.error('[claimBounty]', (error as any)?.message);
        return Response.json({ error: 'Couldn\'t claim your bounty right now. Please try again.' }, { status: 500 });
    }
});
