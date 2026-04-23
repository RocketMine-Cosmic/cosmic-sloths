import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

const verifyCache = new Map();
const VERIFY_CACHE_TTL = 60 * 60 * 1000;

async function verifyToken(sdk, accessToken) {
    const now = Date.now();
    const cached = verifyCache.get(accessToken);
    if (cached && cached.expiresAt > now) return { success: true, walletAddress: cached.walletAddress };
    const result = await sdk.verifyOAuthUser(accessToken);
    if (result.success) {
        verifyCache.set(accessToken, { walletAddress: result.user.walletAddress, expiresAt: now + VERIFY_CACHE_TTL });
        if (verifyCache.size > 500) {
            for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
        }
    }
    return result.success ? { success: true, walletAddress: result.user.walletAddress } : { success: false };
}

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
        const { claim_level, walletAddress: clientWallet, accessToken } = await req.json();

        if (!clientWallet || !accessToken) return Response.json({ error: 'walletAddress and accessToken required' }, { status: 400 });

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await verifyToken(sdk, accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        const walletAddress = verifyResult.walletAddress;

        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Invalid level' }, { status: 400 });

        const week_id = getCurrentWeekId();

        const bossRecords = await db.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) return Response.json({ error: 'No boss' }, { status: 404 });

        const boss = bossRecords[0];
        if (levelNum >= (boss.level || 1)) return Response.json({ error: 'Boss level not defeated yet' }, { status: 400 });

        const contribs = await db.entities.GlobalBossContribution.filter({ week_id, user_id: walletAddress });
        if (contribs.length === 0) return Response.json({ error: 'No contribution found' }, { status: 400 });

        const freshCont = await db.entities.GlobalBossContribution.get(contribs[0].id);
        const claimed_milestones = freshCont.claimed_milestones || [];
        if (claimed_milestones.includes(levelNum)) return Response.json({ error: 'Already claimed' }, { status: 400 });

        const uniqueMilestones = [...new Set([...claimed_milestones, levelNum])].sort((a, b) => a - b);
        await db.entities.GlobalBossContribution.update(freshCont.id, { claimed_milestones: uniqueMilestones });

        const goldReward = levelNum * 250;
        return Response.json({ status: 'success', reward: { type: 'gold', id: goldReward.toString() } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});