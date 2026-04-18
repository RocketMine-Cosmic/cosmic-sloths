import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { week_id } = body;
        
        const bossRecords = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length > 0) {
            return Response.json({ boss: bossRecords[0] });
        }
        
        let charCodeSum = 0;
        for (let i = 0; i < week_id.length; i++) charCodeSum += week_id.charCodeAt(i);
        const reward = { type: 'gold', id: '25000' };
        
        const bossNames = ["The World Eater", "Cosmic Leviathan", "Star Devourer", "Void Sovereign"];
        const bossName = bossNames[charCodeSum % bossNames.length];
        const bossHp = 50000; // 50k HP base
        
        const newBoss = await base44.asServiceRole.entities.GlobalBoss.create({
            week_id,
            boss_id: 'world_boss_' + (charCodeSum % 4),
            name: bossName,
            max_hp: bossHp,
            current_hp: bossHp,
            reward_type: reward.type,
            reward_id: reward.id,
            is_defeated: false,
            level: 1
        });
        
        return Response.json({ boss: newBoss });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});