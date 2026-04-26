import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const verifyCache = new Map();
const VERIFY_CACHE_TTL = 60 * 60 * 1000;
const MAX_SQUAD_MEMBERS = 5;

async function verifyToken(sdk, accessToken) {
    const now = Date.now();
    const cached = verifyCache.get(accessToken);
    if (cached && cached.expiresAt > now) return cached.walletAddress;
    const result = await sdk.verifyOAuthUser(accessToken);
    if (!result.success) throw new Error('Invalid OAuth token');
    const walletAddress = result.user.walletAddress;
    verifyCache.set(accessToken, { walletAddress, expiresAt: now + VERIFY_CACHE_TTL });
    if (verifyCache.size > 500) {
        for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
    }
    return walletAddress;
}

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const { action, accessToken } = body;

        if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });

        const base44 = createClientFromRequest(req);
        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const walletAddress = await verifyToken(sdk, accessToken);

        if (action === 'join') {
            const { squadId, playerName, playerTitle } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });

            await base44.asServiceRole.entities.SquadMember.create({
                squad_id: squadId,
                wallet_address: walletAddress,
                player_name: playerName || 'Pilot',
                player_title: playerTitle || '',
                role: 'member',
                last_payout_week: '',
                last_daily_payout_date: ''
            });

            await base44.asServiceRole.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${playerName || 'A pilot'} has joined the squad!`
            });

            return Response.json({ success: true });
        }

        if (action === 'leave') {
            const { memberId, squadId, playerName } = body;
            if (!memberId || !squadId) return Response.json({ error: 'memberId and squadId required' }, { status: 400 });

            await base44.asServiceRole.entities.SquadMember.delete(memberId);

            await base44.asServiceRole.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${playerName || 'A pilot'} has left the squad.`
            });

            return Response.json({ success: true });
        }

        if (action === 'kick') {
            const { targetMemberId, squadId } = body;
            if (!targetMemberId || !squadId) return Response.json({ error: 'targetMemberId and squadId required' }, { status: 400 });

            await base44.asServiceRole.entities.SquadMember.delete(targetMemberId);

            return Response.json({ success: true });
        }

        if (action === 'sendMessage') {
            const { squadId, content, playerName, playerTitle } = body;
            if (!squadId || !content) return Response.json({ error: 'squadId and content required' }, { status: 400 });

            const message = await base44.asServiceRole.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: walletAddress,
                player_name: playerName || 'Pilot',
                player_title: playerTitle || '',
                content: content.substring(0, 200)
            });
            return Response.json({ success: true, message });
        }

        if (action === 'transferLeadership') {
            const { targetMemberId, squadId } = body;
            if (!targetMemberId || !squadId) return Response.json({ error: 'targetMemberId and squadId required' }, { status: 400 });

            // Find current leader's member record by squad + wallet
            const currentLeaderRecords = await base44.asServiceRole.entities.SquadMember.filter({
                squad_id: squadId,
                wallet_address: walletAddress
            });
            if (currentLeaderRecords.length > 0) {
                await base44.asServiceRole.entities.SquadMember.update(currentLeaderRecords[0].id, { role: 'member' });
            }

            await base44.asServiceRole.entities.SquadMember.update(targetMemberId, { role: 'leader' });

            return Response.json({ success: true, newLeaderMemberId: targetMemberId });
        }

        if (action === 'saveSettings') {
            const { squadId, name, tag, description, icon } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });

            await base44.asServiceRole.entities.Squad.update(squadId, {
                name: name?.trim(),
                tag: tag?.trim().toUpperCase().substring(0, 4),
                description: description?.trim() || '',
                icon: icon || '🛡️'
            });

            return Response.json({ success: true });
        }

        if (action === 'claimWeekly') {
            const { memberId, currentWeek } = body;
            if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

            await base44.asServiceRole.entities.SquadMember.update(memberId, { last_payout_week: currentWeek });

            return Response.json({ success: true });
        }

        if (action === 'claimDaily') {
            const { memberId, currentDay } = body;
            if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

            await base44.asServiceRole.entities.SquadMember.update(memberId, { last_daily_payout_date: currentDay });

            return Response.json({ success: true });
        }

        if (action === 'resetPeriods') {
            const { squadId, updateData } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });

            await base44.asServiceRole.entities.Squad.update(squadId, updateData);

            return Response.json({ success: true });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('[squadActions]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});