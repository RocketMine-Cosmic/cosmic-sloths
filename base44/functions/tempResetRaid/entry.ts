import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Clear raidRuns from PlayerSave
        const saves = await base44.asServiceRole.entities.PlayerSave.filter({});
        let updatedCount = 0;
        
        for (const s of saves) {
            if (s.save_data && (s.save_data.raidRuns || s.save_data.extraRaidRuns)) {
                s.save_data.raidRuns = {};
                s.save_data.extraRaidRuns = {};
                await base44.asServiceRole.entities.PlayerSave.update(s.id, { 
                    save_data: s.save_data,
                    updated_at: Date.now() // Ensure local storage picks up the newer save
                });
                updatedCount++;
            }
        }
        
        return Response.json({ success: true, updatedCount });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});