import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.

function getCurrentPeriodIds() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${year}-S${seasonNum}`;
    return { week_id, season_id };
}

const MAX_DAMAGE_PER_SUBMISSION = 1_000_000;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { damage, playerName } = await req.json();
        if (typeof damage !== 'number' || damage <= 0) {
            return Response.json({ error: 'Invalid damage' }, { status: 400 });
        }

        const clampedDamage = Math.min(damage, MAX_DAMAGE_PER_SUBMISSION);
        const { week_id } = getCurrentPeriodIds();
        const displayName = playerName || me.full_name || walletAddress;

        // Create GlobalBossEvent
        try {
            await base44.asServiceRole.entities.GlobalBossEvent.create({
                week_id,
                player_name: displayName,
                event_type: 'damage',
                damage: clampedDamage,
                message: `${displayName} dealt ${Math.floor(clampedDamage).toLocaleString()} damage!`
            });
        } catch (e) {
            console.error('[submitBossDamage] Event creation failed:', e.message);
        }

        // Create GlobalBossContribution
        try {
            await base44.asServiceRole.entities.GlobalBossContribution.create({
                week_id,
                user_id: walletAddress,
                player_name: displayName,
                damage: clampedDamage,
                claimed: false
            });
        } catch (e) {
            console.error('[submitBossDamage] Contribution failed:', e.message);
        }

        console.log('[submitBossDamage] Recorded damage:', clampedDamage, 'for wallet:', walletAddress);
        return Response.json({ success: true, damage: clampedDamage });
    } catch (error) {
        console.error('[submitBossDamage]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});