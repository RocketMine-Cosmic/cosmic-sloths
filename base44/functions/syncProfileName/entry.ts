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
                await base44.asServiceRole.entities.RunScore.update(score.id, { player_name: newName });
            }
        }
        
        // Update PendingReward (created by system, so match by oldName)
        const rewards = await base44.asServiceRole.entities.PendingReward.filter({ player_name: oldName });
        for (const reward of rewards) {
            await base44.asServiceRole.entities.PendingReward.update(reward.id, { player_name: newName });
        }
        
        // Update SquadMember (match by user_id)
        const members = await base44.asServiceRole.entities.SquadMember.filter({ user_id: user.id });
        for (const member of members) {
            await base44.asServiceRole.entities.SquadMember.update(member.id, { player_name: newName });
        }

        // Update SquadMessage (match by user_id)
        const messages = await base44.asServiceRole.entities.SquadMessage.filter({ user_id: user.id });
        for (const msg of messages) {
            await base44.asServiceRole.entities.SquadMessage.update(msg.id, { player_name: newName });
        }
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});