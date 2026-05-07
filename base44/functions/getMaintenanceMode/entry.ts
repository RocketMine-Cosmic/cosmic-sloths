// Public read of the maintenance gate state. Called from MaintenanceGate every 30s.
// Returns { mode: 'off'|'soft'|'hard', message: string } — never throws to the client,
// because if this errors we want the gate to fail OPEN (don't lock players out
// because the read failed).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const records = await base44.asServiceRole.entities.AppConfig.filter({ key: 'maintenance_mode' });
        if (records.length === 0) {
            return Response.json({ mode: 'off', message: '' });
        }
        const v = records[0].value || {};
        return Response.json({
            mode: v.mode || 'off',
            message: v.message || '',
        });
    } catch (error) {
        // Fail OPEN — surface 'off' so a transient DB hiccup doesn't lock the game.
        console.error('[getMaintenanceMode]', error.message);
        return Response.json({ mode: 'off', message: '' });
    }
});