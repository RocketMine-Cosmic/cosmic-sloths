import { createClientFromRequest } from 'npm:@base44/sdk@0.8.55';
import { claimBossRewardFor } from '../../shared/claims.ts';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// Global Raid milestone claim (shared/claims.ts). The "claimed" marker lives on GlobalBossContribution and is now
// "add this level only if it isn't there" in one database step on the player's oldest row — two claims at the same
// instant can no longer both pass the check and both be paid. The gold is an atomic add on the save, so it can't
// undo a run and a run can't undo it. Save-write fix stage 3a (claude/handoffs/SAVE_WRITES.md, 21 Oct 2026).

// Fire-and-forget Discord alert when a player is marked claimed but the gold credit failed — admins can pay out
// by hand from the wallet + amount logged here.
async function alertUnpaidClaim(wallet: string, level: number, gold: number, errMsg: string) {
    const url = Deno.env.get('DISCORD_ERROR_WEBHOOK');
    if (!url) return;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [{
                title: '⚠️ Boss reward claim marked but UNPAID',
                description: 'Player claim row was updated but PlayerSave.gold credit failed. Manual payout needed.',
                color: 0xef4444,
                fields: [
                    { name: 'Wallet', value: `\`${wallet}\``, inline: true },
                    { name: 'Boss Level', value: String(level), inline: true },
                    { name: 'Owed gold', value: String(gold), inline: true },
                    { name: 'Error', value: String(errMsg || '').slice(0, 500), inline: false },
                ],
                timestamp: new Date().toISOString(),
            }] }),
        });
    } catch {}
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let me: any = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Please sign in to claim your reward.' }, { status: 401 });
        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { claim_level } = await req.json();
        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Couldn\'t process this claim — please refresh and try again.' }, { status: 400 });

        const result = await claimBossRewardFor(base44.asServiceRole, walletAddress, levelNum);
        if (result.creditError) {
            console.error('[claimBossReward] CRITICAL: marked claimed but gold credit failed:', result.creditError);
            await alertUnpaidClaim(walletAddress, levelNum, result.goldReward || levelNum * 250, result.creditError);
        } else if (result.status === 200) {
            console.log('[claimBossReward] Claimed level', levelNum, '+', result.goldReward, 'gold for', walletAddress);
        }
        return Response.json(result.body, { status: result.status });
    } catch (error) {
        console.error('[claimBossReward]', (error as any)?.message);
        return Response.json({ error: 'Couldn\'t claim your reward right now. Please try again.' }, { status: 500 });
    }
});
