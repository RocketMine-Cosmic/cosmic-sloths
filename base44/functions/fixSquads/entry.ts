import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const allSquads = await base44.asServiceRole.entities.Squad.list('-created_date', 1000);
        const allMembers = await base44.asServiceRole.entities.SquadMember.list('-created_date', 5000);
        
        let deletedDuplicates = 0;
        let updatedSquads = 0;
        
        // 1. First, find users who are in multiple squads or duplicated within the same squad
        const userSquads = {}; // user_id -> [member records]
        
        for (const member of allMembers) {
            if (!userSquads[member.user_id]) {
                userSquads[member.user_id] = [];
            }
            userSquads[member.user_id].push(member);
        }
        
        // 2. Clean up duplicates
        for (const [userId, records] of Object.entries(userSquads)) {
            if (records.length > 1) {
                // Sort records to keep the one where they are a leader, or just the oldest one
                records.sort((a, b) => {
                    if (a.role === 'leader' && b.role !== 'leader') return -1;
                    if (b.role === 'leader' && a.role !== 'leader') return 1;
                    return new Date(a.created_date) - new Date(b.created_date);
                });
                
                // Keep the first record, delete the rest
                const toKeep = records[0];
                const toDelete = records.slice(1);
                
                for (const record of toDelete) {
                    await base44.asServiceRole.entities.SquadMember.delete(record.id);
                    deletedDuplicates++;
                }
            }
        }
        
        // 3. Recalculate member counts for all squads
        // Re-fetch members to get the clean list
        const cleanMembers = await base44.asServiceRole.entities.SquadMember.list('-created_date', 5000);
        
        for (const squad of allSquads) {
            const squadMembers = cleanMembers.filter(m => m.squad_id === squad.id);
            const actualCount = squadMembers.length;
            
            if (squad.member_count !== actualCount) {
                await base44.asServiceRole.entities.Squad.update(squad.id, { member_count: actualCount });
                updatedSquads++;
            }
            
            // If the squad has 0 members now, maybe we should delete it? 
            // We'll just update the count for now to be safe.
        }
        
        return Response.json({ success: true, deletedDuplicates, updatedSquads });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});