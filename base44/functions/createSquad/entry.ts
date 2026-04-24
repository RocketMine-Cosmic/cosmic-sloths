import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

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

Deno.serve(async (req) => {
    try {
        const { squadName, squadTag, squadDesc, playerName, playerTitle, accessToken } = await req.json();

        if (!squadName || !squadTag) return Response.json({ error: 'Missing required fields' }, { status: 400 });
        if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await verifyToken(sdk, accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        const walletAddress = verifyResult.walletAddress;

        const tag = squadTag.toUpperCase().substring(0, 4);
        const today = new Date().toISOString().split('T')[0];
        const appId = Deno.env.get('BASE44_APP_ID');
        const syncSecret = Deno.env.get('SYNC_SAVE_SECRET');

        // Create Squad
        const squadUrl = `https://api.base44.com/apps/${appId}/entities/Squad`;
        const squadRes = await fetch(squadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({
                name: squadName, tag, description: squadDesc || '',
                owner_wallet: walletAddress, icon: '🛡️',
                weekly_kills: 0, current_week: today,
                daily_kills: 0, current_day: today,
                member_count: 1, xp: 0, level: 1
            })
        });
        
        if (!squadRes.ok) {
            console.error('[createSquad] Squad creation failed:', squadRes.status);
            return Response.json({ error: 'Failed to create squad' }, { status: 500 });
        }

        const squadData = await squadRes.json();
        const squadId = squadData.id;

        // Create initial SquadMember (leader)
        const memberUrl = `https://api.base44.com/apps/${appId}/entities/SquadMember`;
        await fetch(memberUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({
                squad_id: squadId, wallet_address: walletAddress,
                player_name: playerName || 'Leader', player_title: playerTitle || '',
                role: 'leader', last_payout_week: '', last_daily_payout_date: ''
            })
        }).catch(e => console.error('[createSquad] Member creation failed:', e.message));

        console.log('[createSquad] Created for wallet:', walletAddress);
        return Response.json({ success: true, squad: squadData });
    } catch (error) {
        console.error('[createSquad]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});