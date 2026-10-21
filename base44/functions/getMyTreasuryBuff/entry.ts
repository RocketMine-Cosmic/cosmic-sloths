import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getTreasuryBuffForWallet } from '../../shared/treasuryBuff.ts';

// Returns the squad treasury buff in force for the signed-in player this week.
// Called by the game at run start so the run's levelling-XP bonus comes from
// the server, not from anything cached in the browser. Gold and boss-damage
// bonuses are applied server-side elsewhere; they're returned here only so the
// game can show them.
// Body: none. Response: { tier, squad_id, week_id, xp_pct, gold_pct, boss_pct }
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let me = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Please sign in to continue.' }, { status: 401 });
        const wallet = me.wallet_address;
        if (!wallet) return Response.json({ tier: '', xp_pct: 0, gold_pct: 0, boss_pct: 0 });
        const buff = await getTreasuryBuffForWallet(base44.asServiceRole, wallet);
        return Response.json(buff);
    } catch (error) {
        console.error('[getMyTreasuryBuff]', error?.message || error);
        return Response.json({ tier: '', xp_pct: 0, gold_pct: 0, boss_pct: 0 });
    }
});
