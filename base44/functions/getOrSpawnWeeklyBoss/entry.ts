import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const REWARD_COSMETICS = [
    { type: 'trail', id: 'nebula_dust', name: 'Nebula Dust Trail' },
    { type: 'kill_effect', id: 'supernova', name: 'Supernova Kill Effect' },
    { type: 'trail', id: 'plasma_wake', name: 'Plasma Wake Trail' }
];

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
        const reward = REWARD_COSMETICS[charCodeSum % REWARD_COSMETICS.length];
        
        const bossNames = ["The World Eater", "Cosmic Leviathan", "Star Devourer", "Void Sovereign"];
        const bossName = bossNames[charCodeSum % bossNames.length];
        const bossHp = 50000000; // 50 Million HP base
        
        const newBoss = await base44.asServiceRole.entities.GlobalBoss.create({
            week_id,
            boss_id: 'world_boss_' + (charCodeSum % 4),
            name: bossName,
            max_hp: bossHp,
            current_hp: bossHp,
            reward_type: reward.type,
            reward_id: reward.id,
            is_defeated: false
        });
        
        return Response.json({ boss: newBoss });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});