import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ error: 'OmenX wallet not linked' }, { status: 400 });
        }

        const { claim_level } = await req.json();

        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Invalid level' }, { status: 400 });

        const week_id = getCurrentWeekId();
        const appId = Deno.env.get('BASE44_APP_ID');
        const syncSecret = Deno.env.get('SYNC_SAVE_SECRET');

        // Update GlobalBossContribution with claimed milestone
        const contribUrl = `https://api.base44.com/apps/${appId}/entities/GlobalBossContribution`;
        const updateRes = await fetch(`${contribUrl}?week_id=${week_id}&user_id=${encodeURIComponent(wallet)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({
                $push: { claimed_milestones: levelNum }
            })
        });

        if (!updateRes.ok) {
            console.error('[claimBossReward] Update failed:', updateRes.status);
            return Response.json({ error: 'Failed to claim reward' }, { status: 500 });
        }

        const goldReward = levelNum * 250;
        console.log('[claimBossReward] Claimed level', levelNum, 'for wallet:', wallet);
        return Response.json({ status: 'success', reward: { type: 'gold', id: goldReward.toString() } });
    } catch (error) {
        console.error('[claimBossReward]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});