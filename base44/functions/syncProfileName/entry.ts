import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { oldName, newName } = await req.json();
        
        if (!oldName || !newName) {
             return Response.json({ error: 'oldName and newName required' }, { status: 400 });
        }

        // Update RunScore (match by oldName and verify ownership via created_by to prevent hijacking)
        const runScores = await base44.asServiceRole.entities.RunScore.filter({ player_name: oldName });
        for (const score of runScores) {
            if (score.created_by === user.email) {
                await base44.asServiceRole.entities.RunScore.update(score.id, { 
                    player_name: newName,
                    user_id: score.user_id || user.id, // Ensure required fields are not dropped from old records
                    score: score.score || 0,
                    week_id: score.week_id || 'unknown',
                    season_id: score.season_id || 'unknown'
                });
            }
        }
        
        // Update PendingReward (created by system, so match by oldName)
        const rewards = await base44.asServiceRole.entities.PendingReward.filter({ player_name: oldName });
        for (const reward of rewards) {
            await base44.asServiceRole.entities.PendingReward.update(reward.id, { 
                player_name: newName,
                amount: reward.amount || 0,
                reason: reward.reason || 'unknown',
                period_id: reward.period_id || 'unknown'
            });
        }
        
        // Update SquadMember (match by user_id)
        const members = await base44.asServiceRole.entities.SquadMember.filter({ user_id: user.id });
        for (const member of members) {
            await base44.asServiceRole.entities.SquadMember.update(member.id, { 
                player_name: newName,
                squad_id: member.squad_id || 'unknown',
                user_id: member.user_id || user.id
            });
        }

        // Update SquadMessage (match by user_id)
        const messages = await base44.asServiceRole.entities.SquadMessage.filter({ user_id: user.id });
        for (const msg of messages) {
            await base44.asServiceRole.entities.SquadMessage.update(msg.id, { 
                player_name: newName,
                squad_id: msg.squad_id || 'unknown',
                user_id: msg.user_id || user.id,
                content: msg.content || ''
            });
        }
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});