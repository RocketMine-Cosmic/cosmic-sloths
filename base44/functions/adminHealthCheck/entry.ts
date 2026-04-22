import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const { walletAddress, accessToken } = body;

        if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });

        const now = new Date();
        const year = now.getUTCFullYear();
        const startOfYear = new Date(Date.UTC(year, 0, 1));
        const startOfWeek = new Date(startOfYear);
        startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
        const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
        const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
        const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
        const season_id = `${year}-S${seasonNum}`;

        const [pools, saves, weekScores, squads, members, bosses, contributions] = await Promise.all([
            db.entities.TokenPool.filter({ distributed: false }),
            db.entities.PlayerSave.list('-updated_at', 1),
            db.entities.RunScore.filter({ week_id }),
            db.entities.Squad.list('-created_date', 500),
            db.entities.SquadMember.list('-created_date', 1000),
            db.entities.GlobalBoss.filter({ week_id }),
            db.entities.GlobalBossContribution.filter({ week_id }),
        ]);

        const walletMap = {};
        weekScores.forEach(s => {
            if (!s.wallet_address) return;
            walletMap[s.wallet_address] = (walletMap[s.wallet_address] || 0) + 1;
        });
        const duplicateCount = Object.values(walletMap).filter(c => c > 1).length;

        const squadIds = new Set(squads.map(s => s.id));
        const orphanedMembers = members.filter(m => !squadIds.has(m.squad_id)).length;

        const weeklyPool = pools.find(p => p.period_type === 'weekly' && p.period_id === week_id);
        const seasonalPool = pools.find(p => p.period_type === 'seasonal' && p.period_id === season_id);

        const boss = bosses.length > 0 ? bosses[0] : null;
        const bossHpPct = boss ? Math.round((boss.current_hp / boss.max_hp) * 100) : null;

        const allSaves = await db.entities.PlayerSave.list('-updated_at', 1000);

        return Response.json({
            week_id, season_id,
            undistributedCount: pools.length,
            weeklyPoolExists: !!weeklyPool,
            seasonalPoolExists: !!seasonalPool,
            totalPlayers: allSaves.length,
            scoresThisWeek: weekScores.length,
            duplicateCount, orphanedMembers,
            bossExists: !!boss,
            bossDefeated: boss?.is_defeated || false,
            bossHpPct,
            bossContributors: contributions.length,
        });
    } catch (error) {
        console.error('[adminHealthCheck]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});