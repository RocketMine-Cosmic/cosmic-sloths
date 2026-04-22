import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import { createClient } from 'npm:@base44/sdk@0.8.25';

const MAX_SQUAD_MEMBERS = 5;

async function verifyToken(sdk, accessToken) {
    const result = await sdk.verifyOAuthUser(accessToken);
    if (!result.success) throw new Error('Invalid OAuth token');
    return result.user.walletAddress;
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
        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole.entities;

        // --- JOIN SQUAD ---
        if (action === 'join') {
            const { squadId, playerName, playerTitle } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });

            const [existing, squad] = await Promise.all([
                db.entities.SquadMember.filter({ wallet_address: walletAddress }),
                db.entities.Squad.get(squadId),
            ]);
            if (existing.length > 0) return Response.json({ error: 'You are already in a squad.' }, { status: 409 });
            if ((squad.member_count || 0) >= MAX_SQUAD_MEMBERS) return Response.json({ error: 'Squad is full.' }, { status: 409 });

            const member = await db.entities.SquadMember.create({
                squad_id: squadId,
                wallet_address: walletAddress,
                player_name: playerName || 'Pilot',
                player_title: playerTitle || '',
                role: 'member',
                last_payout_week: '',
                last_daily_payout_date: '',
            });
            await db.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${playerName || 'A pilot'} has joined the squad!`,
            });
            const updatedSquad = await db.entities.Squad.update(squadId, {
                member_count: (squad.member_count || 0) + 1,
            });
            return Response.json({ success: true, member, squad: updatedSquad });
        }

        // --- LEAVE SQUAD ---
        if (action === 'leave') {
            const { memberId, squadId, playerName } = body;
            if (!memberId || !squadId) return Response.json({ error: 'memberId and squadId required' }, { status: 400 });

            // Verify the member record belongs to this wallet
            const memberRecord = await db.entities.SquadMember.get(memberId);
            if (memberRecord.wallet_address !== walletAddress) return Response.json({ error: 'Forbidden' }, { status: 403 });

            const squad = await db.entities.Squad.get(squadId);
            await db.entities.SquadMember.delete(memberId);
            await db.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${playerName || 'A pilot'} has left the squad.`,
            });
            await db.entities.Squad.update(squadId, {
                member_count: Math.max(0, (squad.member_count || 1) - 1),
            });
            return Response.json({ success: true });
        }

        // --- KICK MEMBER ---
        if (action === 'kick') {
            const { targetMemberId, squadId } = body;
            if (!targetMemberId || !squadId) return Response.json({ error: 'targetMemberId and squadId required' }, { status: 400 });

            // Verify kicker is squad leader
            const [leaderRecords, targetMember, squad] = await Promise.all([
                db.entities.SquadMember.filter({ squad_id: squadId, wallet_address: walletAddress }),
                db.entities.SquadMember.get(targetMemberId),
                db.entities.Squad.get(squadId),
            ]);
            if (leaderRecords.length === 0 || leaderRecords[0].role !== 'leader') {
                return Response.json({ error: 'Only the squad leader can kick members.' }, { status: 403 });
            }
            if (targetMember.wallet_address === walletAddress) {
                return Response.json({ error: 'Cannot kick yourself.' }, { status: 400 });
            }

            await db.entities.SquadMember.delete(targetMemberId);
            await db.entities.Squad.update(squadId, {
                member_count: Math.max(0, (squad.member_count || 1) - 1),
            });
            await db.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${targetMember.player_name} was removed from the squad.`,
            });
            return Response.json({ success: true });
        }

        // --- SEND MESSAGE ---
        if (action === 'sendMessage') {
            const { squadId, content, playerName, playerTitle } = body;
            if (!squadId || !content) return Response.json({ error: 'squadId and content required' }, { status: 400 });

            // Verify sender is a squad member
            const members = await db.entities.SquadMember.filter({ squad_id: squadId, wallet_address: walletAddress });
            if (members.length === 0) return Response.json({ error: 'Not a member of this squad.' }, { status: 403 });

            const message = await db.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: walletAddress,
                player_name: playerName || 'Pilot',
                player_title: playerTitle || '',
                content: content.substring(0, 200),
            });
            return Response.json({ success: true, message });
        }

        // --- TRANSFER LEADERSHIP ---
        if (action === 'transferLeadership') {
            const { targetMemberId, squadId } = body;
            if (!targetMemberId || !squadId) return Response.json({ error: 'targetMemberId and squadId required' }, { status: 400 });

            const [leaderRecords, targetMember] = await Promise.all([
                db.entities.SquadMember.filter({ squad_id: squadId, wallet_address: walletAddress }),
                db.entities.SquadMember.get(targetMemberId),
            ]);
            if (leaderRecords.length === 0 || leaderRecords[0].role !== 'leader') {
                return Response.json({ error: 'Only the squad leader can transfer leadership.' }, { status: 403 });
            }

            await Promise.all([
                db.entities.SquadMember.update(leaderRecords[0].id, { role: 'member' }),
                db.entities.SquadMember.update(targetMemberId, { role: 'leader' }),
                db.entities.Squad.update(squadId, { owner_wallet: targetMember.wallet_address }),
            ]);
            await db.entities.SquadMessage.create({
                squad_id: squadId,
                wallet_address: 'system',
                player_name: 'SYSTEM',
                content: `${targetMember.player_name} is now the squad leader!`,
            });
            return Response.json({ success: true, newLeaderMemberId: targetMemberId, oldLeaderMemberId: leaderRecords[0].id });
        }

        // --- SAVE SETTINGS ---
        if (action === 'saveSettings') {
            const { squadId, name, tag, description, icon } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });

            const leaderRecords = await db.entities.SquadMember.filter({ squad_id: squadId, wallet_address: walletAddress });
            if (leaderRecords.length === 0 || leaderRecords[0].role !== 'leader') {
                return Response.json({ error: 'Only the squad leader can change settings.' }, { status: 403 });
            }

            const updated = await db.entities.Squad.update(squadId, {
                name: name?.trim(),
                tag: tag?.trim().toUpperCase().substring(0, 4),
                description: description?.trim() || '',
                icon: icon || '🛡️',
            });
            return Response.json({ success: true, squad: updated });
        }

        // --- CLAIM WEEKLY BOUNTY ---
        if (action === 'claimWeekly') {
            const { memberId, currentWeek, gold, relicFragments } = body;
            const memberRecord = await db.entities.SquadMember.get(memberId);
            if (memberRecord.wallet_address !== walletAddress) return Response.json({ error: 'Forbidden' }, { status: 403 });
            if (memberRecord.last_payout_week === currentWeek) return Response.json({ error: 'Already claimed this week.' }, { status: 409 });

            const updated = await db.entities.SquadMember.update(memberId, { last_payout_week: currentWeek });
            return Response.json({ success: true, member: updated });
        }

        // --- CLAIM DAILY BOUNTY ---
        if (action === 'claimDaily') {
            const { memberId, currentDay } = body;
            const memberRecord = await db.entities.SquadMember.get(memberId);
            if (memberRecord.wallet_address !== walletAddress) return Response.json({ error: 'Forbidden' }, { status: 403 });
            if (memberRecord.last_daily_payout_date === currentDay) return Response.json({ error: 'Already claimed today.' }, { status: 409 });

            const updated = await db.entities.SquadMember.update(memberId, { last_daily_payout_date: currentDay });
            return Response.json({ success: true, member: updated });
        }

        // --- RESET WEEKLY/DAILY KILLS ---
        if (action === 'resetPeriods') {
            const { squadId, updateData } = body;
            if (!squadId) return Response.json({ error: 'squadId required' }, { status: 400 });

            // Verify caller is a member of this squad
            const members = await db.entities.SquadMember.filter({ squad_id: squadId, wallet_address: walletAddress });
            if (members.length === 0) return Response.json({ error: 'Not a member of this squad.' }, { status: 403 });

            const updated = await db.entities.Squad.update(squadId, updateData);
            return Response.json({ success: true, squad: updated });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        console.error('[squadActions]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});