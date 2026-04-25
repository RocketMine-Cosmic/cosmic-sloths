import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
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
        const base44 = createClientFromRequest(req);
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

        const [existingName, existingTag, existingMembership] = await Promise.all([
            base44.asServiceRole.entities.Squad.filter({ name: squadName }),
            base44.asServiceRole.entities.Squad.filter({ tag }),
            base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress }),
        ]);

        if (existingName.length > 0) return Response.json({ error: 'A squad with that name already exists.' }, { status: 409 });
        if (existingTag.length > 0) return Response.json({ error: 'A squad with that tag already exists.' }, { status: 409 });
        if (existingMembership.length > 0) return Response.json({ error: 'You are already a member of a squad. Leave your current squad first.' }, { status: 409 });

        const squad = await base44.asServiceRole.entities.Squad.create({
            name: squadName, tag, description: squadDesc || '',
            owner_wallet: walletAddress, icon: '🛡️',
            weekly_kills: 0, current_week: today,
            daily_kills: 0, current_day: today,
            member_count: 1, xp: 0, level: 1
        });

        const member = await base44.asServiceRole.entities.SquadMember.create({
            squad_id: squad.id, wallet_address: walletAddress,
            player_name: playerName || 'Leader', player_title: playerTitle || '',
            role: 'leader', last_payout_week: '', last_daily_payout_date: ''
        });

        return Response.json({ success: true, squad, member });
    } catch (error) {
        console.error('[createSquad]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});