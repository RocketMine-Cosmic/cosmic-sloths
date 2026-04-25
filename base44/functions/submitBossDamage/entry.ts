import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ error: 'OmenX wallet not linked' }, { status: 400 });
        }

        const { damage, playerName } = await req.json();

        if (typeof damage !== 'number' || damage <= 0) {
            return Response.json({ error: 'Invalid damage' }, { status: 400 });
        }

        const clampedDamage = Math.min(damage, MAX_DAMAGE_PER_SUBMISSION);
        const { week_id } = getCurrentPeriodIds();
        const appId = Deno.env.get('BASE44_APP_ID');
        const syncSecret = Deno.env.get('SYNC_SAVE_SECRET');

        // Create GlobalBossEvent
        const eventUrl = `https://api.base44.com/apps/${appId}/entities/GlobalBossEvent`;
        const eventMessage = `${playerName || wallet} dealt ${Math.floor(clampedDamage).toLocaleString()} damage!`;
        await fetch(eventUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({
                week_id,
                player_name: playerName || wallet,
                event_type: 'damage',
                damage: clampedDamage,
                message: eventMessage
            })
        }).catch(e => console.error('[submitBossDamage] Event creation failed:', e.message));

        // Update or create GlobalBossContribution
        const contributionUrl = `https://api.base44.com/apps/${appId}/entities/GlobalBossContribution`;
        await fetch(contributionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({
                week_id,
                user_id: wallet,
                player_name: playerName || wallet,
                damage: clampedDamage,
                claimed: false
            })
        }).catch(e => console.error('[submitBossDamage] Contribution failed:', e.message));

        console.log('[submitBossDamage] Recorded damage:', clampedDamage, 'for wallet:', wallet);
        return Response.json({ success: true, damage: clampedDamage });
    } catch (error) {
        console.error('[submitBossDamage]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});