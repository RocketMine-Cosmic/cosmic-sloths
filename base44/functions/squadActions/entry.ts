import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// No OmenX token needed — wallet was linked at first login.

const MAX_SQUAD_MEMBERS = 5;

// Server-authoritative bounty reward tables (must mirror pages/Squads.jsx for UI display)
const WEEKLY_BOUNTY_TIERS = [
    { minLevel: 1, target: 2000,  gold: 500,   fragments: 1 },
    { minLevel: 2, target: 5000,  gold: 1200,  fragments: 2 },
    { minLevel: 3, target: 10000, gold: 2500,  fragments: 3 },
    { minLevel: 4, target: 18000, gold: 4000,  fragments: 4 },
    { minLevel: 5, target: 30000, gold: 6500,  fragments: 5 },
    { minLevel: 6, target: 50000, gold: 10000, fragments: 7 },
    { minLevel: 7, target: 75000, gold: 15000, fragments: 10 },
];
const DAILY_BOUNTY_TIERS = [
    { minLevel: 1, target: 300,   gold: 150,  fragments: 0 },
    { minLevel: 2, target: 800,   gold: 300,  fragments: 0 },
    { minLevel: 3, target: 1500,  gold: 600,  fragments: 1 },
    { minLevel: 4, target: 2500,  gold: 1000, fragments: 1 },
    { minLevel: 5, target: 4500,  gold: 1500, fragments: 2 },
    { minLevel: 6, target: 7500,  gold: 2500, fragments: 2 },
    { minLevel: 7, target: 12000, gold: 4000, fragments: 3 },
];
function getTier(level, table) {
    let tier = table[0];
    for (const t of table) if (level >= t.minLevel) tier = t;
    return tier;
}

// Grants gold/fragments directly to the player's cloud PlayerSave so the
// reward grant is server-authoritative and can't be tampered with by the client.
async function grantToPlayerSave(base44, walletAddress, gold, fragments) {
    const walletLower = walletAddress.toLowerCase();
    const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });
    if (records.length === 0) throw new Error('PlayerSave not found');
    const record = records[0];
    const saveData = typeof record.save_data === 'string' ? JSON.parse(record.save_data) : record.save_data;
    saveData.gold = (saveData.gold || 0) + gold;
    if (fragments > 0) saveData.relicFragments = (saveData.relicFragments || 0) + fragments;
    saveData.updated_at = Date.now();
    await base44.asServiceRole.entities.PlayerSave.update(record.id, {
        save_data: saveData,
        updated_at: Date.now()
    });
    return { gold: saveData.gold, relicFragments: saveData.relicFragments || 0 };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const body = await req.json();
        const { action } = body;

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

        if (action === 'claimWeekly' || action === 'claimDaily') {
            const { memberId, squadId, currentWeek, currentDay } = body;
            if (!memberId || !squadId) return Response.json({ error: 'memberId and squadId required' }, { status: 400 });

            // Load member + squad to validate
            const member = await base44.asServiceRole.entities.SquadMember.read(memberId);
            if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
            if (member.wallet_address !== walletAddress) return Response.json({ error: 'Forbidden' }, { status: 403 });
            if (member.squad_id !== squadId) return Response.json({ error: 'Member not in squad' }, { status: 400 });

            // 24h new-member cooldown
            if (member.created_date) {
                const joinDate = new Date(member.created_date).getTime();
                if (Date.now() - joinDate < 24 * 60 * 60 * 1000) {
                    return Response.json({ error: 'New member cooldown — wait 24h after joining' }, { status: 403 });
                }
            }

            const squad = await base44.asServiceRole.entities.Squad.read(squadId);
            if (!squad) return Response.json({ error: 'Squad not found' }, { status: 404 });

            const isWeekly = action === 'claimWeekly';
            const periodId = isWeekly ? currentWeek : currentDay;
            if (!periodId) return Response.json({ error: 'period id required' }, { status: 400 });
            const lastClaimedField = isWeekly ? 'last_payout_week' : 'last_daily_payout_date';
            const killsField = isWeekly ? 'weekly_kills' : 'daily_kills';
            const tier = getTier(squad.level || 1, isWeekly ? WEEKLY_BOUNTY_TIERS : DAILY_BOUNTY_TIERS);

            // Check already claimed
            if (member[lastClaimedField] === periodId) {
                return Response.json({ error: 'Already claimed', alreadyClaimed: true }, { status: 409 });
            }
            // Check progress threshold met
            if ((squad[killsField] || 0) < tier.target) {
                return Response.json({ error: 'Bounty target not yet reached' }, { status: 400 });
            }

            // Mark claimed FIRST so concurrent calls fail
            await base44.asServiceRole.entities.SquadMember.update(memberId, { [lastClaimedField]: periodId });

            // Grant rewards to player's cloud PlayerSave
            const updatedTotals = await grantToPlayerSave(base44, walletAddress, tier.gold, tier.fragments);

            return Response.json({
                success: true,
                reward: { gold: tier.gold, fragments: tier.fragments },
                saveData: updatedTotals,
                member: { ...member, [lastClaimedField]: periodId },
            });
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