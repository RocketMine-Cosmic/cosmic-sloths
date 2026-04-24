import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Find all PlayerSaves with hasSetProfileName === false (the modal-loop victims)
        const affectedSaves = await base44.asServiceRole.entities.PlayerSave.filter({ hasSetProfileName: false }, '-updated_date', 1000);
        
        if (affectedSaves.length === 0) {
            return Response.json({ success: true, message: 'No affected saves found', count: 0 });
        }

        let fixed = 0;
        const errors = [];

        for (const save of affectedSaves) {
            try {
                const updated = {
                    ...save,
                    hasSetProfileName: true,
                    updated_at: Date.now()
                };
                
                // If no pilot name set, assign a default based on wallet
                if (!updated.save_data?.pilotName || updated.save_data.pilotName.toLowerCase() === 'anonymous') {
                    updated.save_data = {
                        ...updated.save_data,
                        pilotName: `Pilot_${save.wallet_address.slice(-6).toUpperCase()}`
                    };
                }

                await base44.asServiceRole.entities.PlayerSave.update(save.id, updated);
                fixed++;
            } catch (err) {
                errors.push({ saveId: save.id, wallet: save.wallet_address, error: err.message });
            }
        }

        console.log(`[cleanupAffectedSaves] Fixed ${fixed}/${affectedSaves.length} saves. Errors: ${errors.length}`);
        
        return Response.json({ 
            success: true, 
            message: `Fixed ${fixed} saves with sticking profile name modal issue`,
            count: fixed,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('[cleanupAffectedSaves]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});