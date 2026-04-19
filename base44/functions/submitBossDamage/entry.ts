import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Canonical period ID calculation — must match purchaseSku, saveScore, and lib/periodIds.js exactly
function getCurrentPeriodIds() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 13) + 1;
    const season_id = `${year}-S${seasonNum}`;
    return { week_id, season_id };
}

const MAX_DAMAGE_PER_SUBMISSION = 1_000_000;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;

        const body = await req.json();
        const { damage, playerName, walletAddress: clientWallet, accessToken } = body;

        if (!clientWallet || !accessToken) return Response.json({ error: 'walletAddress and accessToken required' }, { status: 400 });

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        const walletAddress = verifyResult.user.walletAddress;
        if (typeof damage !== 'number' || damage <= 0) return Response.json({ error: 'Invalid damage' }, { status: 400 });

        const clampedDamage = Math.min(damage, MAX_DAMAGE_PER_SUBMISSION);
        const { week_id } = getCurrentPeriodIds();

        const bossRecords = await db.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) return Response.json({ error: 'No boss active' }, { status: 404 });

        const boss = bossRecords[0];
        if (boss.is_defeated) return Response.json({ error: 'Boss already defeated' }, { status: 400 });

        let newHp = Math.max(0, boss.current_hp - clampedDamage);
        let updates = { current_hp: newHp };

        const killed = newHp === 0;
        if (killed) {
            const nextLevel = (boss.level || 1) + 1;
            const nextMaxHp = Math.floor(boss.max_hp * 1.5);
            updates = { level: nextLevel, max_hp: nextMaxHp, current_hp: nextMaxHp, is_defeated: false };
            newHp = nextMaxHp;
        }

        await db.entities.GlobalBoss.update(boss.id, updates);

        const displayName = playerName || walletAddress;
        const eventType = killed ? 'kill' : 'damage';
        const eventMessage = killed
            ? `${displayName} defeated the Level ${boss.level || 1} Boss!`
            : `${displayName} dealt ${Math.floor(clampedDamage).toLocaleString()} damage!`;

        await db.entities.GlobalBossEvent.create({
            week_id, player_name: displayName, event_type: eventType,
            damage: clampedDamage, level: boss.level || 1, message: eventMessage
        });

        // Use walletAddress as the canonical identity
        const existing = await db.entities.GlobalBossContribution.filter({ week_id, user_id: walletAddress });
        if (existing.length > 0) {
            await db.entities.GlobalBossContribution.update(existing[0].id, {
                damage: existing[0].damage + clampedDamage,
                player_name: displayName
            });
        } else {
            await db.entities.GlobalBossContribution.create({
                week_id, user_id: walletAddress, player_name: displayName,
                damage: clampedDamage, claimed: false
            });
        }

        return Response.json({ status: 'success', boss: { ...boss, current_hp: newHp } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});