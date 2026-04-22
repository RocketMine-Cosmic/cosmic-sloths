import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

function getCurrentWeekId() {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${now.getUTCFullYear()}-W${String(isoWeek).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const { accessToken } = body;
        if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        const walletAddress = verifyResult.user.walletAddress;

        const currentWeekId = getCurrentWeekId();
        const contribs = await db.entities.GlobalBossContribution.filter({ user_id: walletAddress });
        
        let totalGold = 0;
        let pastUnclaimedCount = 0;

        for (const cont of contribs) {
            if (cont.week_id === currentWeekId) continue;
            
            const bossRecords = await db.entities.GlobalBoss.filter({ week_id: cont.week_id });
            if (bossRecords.length === 0) continue;
            
            const boss = bossRecords[0];
            const bossLevel = boss.level || 1;
            
            let claimed_milestones = cont.claimed_milestones || [];
            let newlyClaimed = [];
            
            for (let lvl = 1; lvl < bossLevel; lvl++) {
                if (!claimed_milestones.includes(lvl)) {
                    newlyClaimed.push(lvl);
                    totalGold += (lvl * 1000);
                    claimed_milestones.push(lvl);
                    pastUnclaimedCount++;
                }
            }
            
            if (newlyClaimed.length > 0) {
                await db.entities.GlobalBossContribution.update(cont.id, { claimed_milestones });
            }
        }
        
        return Response.json({ status: 'success', totalGold, pastUnclaimedCount });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});