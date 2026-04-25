import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

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

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const walletAddress = await verifyToken(sdk, accessToken);
        const appId = Deno.env.get('BASE44_APP_ID');
        const syncSecret = Deno.env.get('SYNC_SAVE_SECRET');

        if (action === 'join') {
            const { squadId, playerName, playerTitle } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });
            
            const memberUrl = `https://api.base44.com/apps/${appId}/entities/SquadMember`;
            await fetch(memberUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({
                    squad_id: squadId, wallet_address: walletAddress,
                    player_name: playerName || 'Pilot', player_title: playerTitle || '',
                    role: 'member', last_payout_week: '', last_daily_payout_date: ''
                })
            }).catch(e => console.error('[squadActions] SquadMember create failed:', e.message));

            const msgUrl = `https://api.base44.com/apps/${appId}/entities/SquadMessage`;
            await fetch(msgUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({
                    squad_id: squadId, wallet_address: 'system', player_name: 'SYSTEM',
                    content: `${playerName || 'A pilot'} has joined the squad!`
                })
            }).catch(e => console.error('[squadActions] Message creation failed:', e.message));

            return Response.json({ success: true });
        }

        if (action === 'leave') {
            const { memberId, squadId, playerName } = body;
            if (!memberId || !squadId) return Response.json({ error: 'memberId and squadId required' }, { status: 400 });
            
            const memberUrl = `https://api.base44.com/apps/${appId}/entities/SquadMember/${memberId}`;
            await fetch(memberUrl, {
                method: 'DELETE',
                headers: { 'X-Sync-Secret': syncSecret }
            }).catch(e => console.error('[squadActions] Member delete failed:', e.message));

            const msgUrl = `https://api.base44.com/apps/${appId}/entities/SquadMessage`;
            await fetch(msgUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({
                    squad_id: squadId, wallet_address: 'system', player_name: 'SYSTEM',
                    content: `${playerName || 'A pilot'} has left the squad.`
                })
            }).catch(e => console.error('[squadActions] Message creation failed:', e.message));

            return Response.json({ success: true });
        }

        if (action === 'kick') {
            const { targetMemberId, squadId } = body;
            if (!targetMemberId || !squadId) return Response.json({ error: 'targetMemberId and squadId required' }, { status: 400 });
            
            const memberUrl = `https://api.base44.com/apps/${appId}/entities/SquadMember/${targetMemberId}`;
            await fetch(memberUrl, {
                method: 'DELETE',
                headers: { 'X-Sync-Secret': syncSecret }
            }).catch(e => console.error('[squadActions] Member delete failed:', e.message));

            return Response.json({ success: true });
        }

        if (action === 'sendMessage') {
            const { squadId, content, playerName, playerTitle } = body;
            if (!squadId || !content) return Response.json({ error: 'squadId and content required' }, { status: 400 });
            
            const msgData = {
                squad_id: squadId, wallet_address: walletAddress,
                player_name: playerName || 'Pilot', player_title: playerTitle || '',
                content: content.substring(0, 200)
            };
            
            const message = await db.entities.SquadMessage.create(msgData);
            return Response.json({ success: true, message });
        }

        if (action === 'transferLeadership') {
            const { targetMemberId, squadId } = body;
            if (!targetMemberId || !squadId) return Response.json({ error: 'targetMemberId and squadId required' }, { status: 400 });
            
            const leaderUrl = `https://api.base44.com/apps/${appId}/entities/SquadMember`;
            // Update old leader to member role
            await fetch(`${leaderUrl}?squad_id=${squadId}&wallet_address=${encodeURIComponent(walletAddress)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({ role: 'member' })
            }).catch(e => console.error('[squadActions] Leader update failed:', e.message));

            // Update new leader
            await fetch(`${leaderUrl}/${targetMemberId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({ role: 'leader' })
            }).catch(e => console.error('[squadActions] New leader update failed:', e.message));

            return Response.json({ success: true, newLeaderMemberId: targetMemberId });
        }

        if (action === 'saveSettings') {
            const { squadId, name, tag, description, icon } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });
            
            const squadUrl = `https://api.base44.com/apps/${appId}/entities/Squad/${squadId}`;
            await fetch(squadUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({
                    name: name?.trim(),
                    tag: tag?.trim().toUpperCase().substring(0, 4),
                    description: description?.trim() || '',
                    icon: icon || '🛡️'
                })
            }).catch(e => console.error('[squadActions] Squad update failed:', e.message));

            return Response.json({ success: true });
        }

        if (action === 'claimWeekly') {
            const { memberId, currentWeek } = body;
            const memberUrl = `https://api.base44.com/apps/${appId}/entities/SquadMember/${memberId}`;
            await fetch(memberUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({ last_payout_week: currentWeek })
            }).catch(e => console.error('[squadActions] Claim update failed:', e.message));

            return Response.json({ success: true });
        }

        if (action === 'claimDaily') {
            const { memberId, currentDay } = body;
            const memberUrl = `https://api.base44.com/apps/${appId}/entities/SquadMember/${memberId}`;
            await fetch(memberUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({ last_daily_payout_date: currentDay })
            }).catch(e => console.error('[squadActions] Claim update failed:', e.message));

            return Response.json({ success: true });
        }

        if (action === 'resetPeriods') {
            const { squadId, updateData } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });
            
            const squadUrl = `https://api.base44.com/apps/${appId}/entities/Squad/${squadId}`;
            await fetch(squadUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify(updateData)
            }).catch(e => console.error('[squadActions] Squad reset failed:', e.message));

            return Response.json({ success: true });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('[squadActions]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});