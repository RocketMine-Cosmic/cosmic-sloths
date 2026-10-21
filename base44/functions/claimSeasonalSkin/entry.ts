import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { claimSeasonalSkinFor } from '../../shared/claims.ts';

// Server-authoritative seasonal-skin claim: spend 100 seasonalPoints, unlock ONE skin from the allowlist
// (shared/claims.ts — mirrors the isSeasonalReward entries in game/Constants.js). The spend and the unlock happen in
// ONE atomic database step, only if the player still has the points and still doesn't own the skin — so several
// claims at once can never spend more points than they have. Save-write fix stage 3a (claude/handoffs/SAVE_WRITES.md).

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let me: any = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Please sign in to claim your skin.' }, { status: 401 });
        const wallet = me.wallet_address;
        if (!wallet) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { skinId } = await req.json();
        if (!skinId || typeof skinId !== 'string') {
            return Response.json({ error: 'Missing skin info — please refresh and try again.' }, { status: 400 });
        }
        const result = await claimSeasonalSkinFor(base44.asServiceRole, wallet.toLowerCase(), skinId);
        return Response.json(result.body, { status: result.status });
    } catch (error) {
        console.error('[claimSeasonalSkin]', (error as any)?.message);
        return Response.json({ error: 'Couldn\'t claim your skin right now. Please try again.' }, { status: 500 });
    }
});
