// Public read of the maintenance gate state. Called from MaintenanceGate every 30s.
// Returns { mode: 'off'|'soft'|'hard', message: string } — never throws to the client,
// because if this errors we want the gate to fail OPEN (don't lock players out
// because the read failed).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Read both flags in parallel — independent toggles. Maintenance gate
        // controls the SOFT/HARD banner; omenx_purchases_disabled is a separate
        // switch used when the OmenX settlement service is degraded but the
        // game itself is still playable.
        const [maintRecords, omenxRecords] = await Promise.all([
            base44.asServiceRole.entities.AppConfig.filter({ key: 'maintenance_mode' }),
            base44.asServiceRole.entities.AppConfig.filter({ key: 'omenx_purchases_disabled' }),
        ]);
        const m = maintRecords[0]?.value || {};
        const o = omenxRecords[0]?.value || {};
        return Response.json({
            mode: m.mode || 'off',
            message: m.message || '',
            omenxPurchasesDisabled: !!o.disabled,
            omenxPurchasesMessage: o.message || '',
        });
    } catch (error) {
        // Fail OPEN — surface 'off' so a transient DB hiccup doesn't lock the game.
        console.error('[getMaintenanceMode]', error.message);
        return Response.json({ mode: 'off', message: '', omenxPurchasesDisabled: false, omenxPurchasesMessage: '' });
    }
});