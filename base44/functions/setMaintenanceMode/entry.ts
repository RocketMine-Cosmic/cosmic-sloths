// Admin-gated toggle for the rollover maintenance gate.
// Writes a single AppConfig row with key='maintenance_mode'.
// Modes:
//   'off'  — gate hidden, game runs normally
//   'soft' — top banner on every page warning of upcoming rollout, gameplay still allowed
//   'hard' — full-screen overlay blocks the /game route, players can chat/read but not start runs
//
// Manual flip only — no automation. If something breaks at rollover the operator
// should NOT be on a timer; they should hit OFF when ready.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_MODES = ['off', 'soft', 'hard'];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (me.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

        const { mode, message } = await req.json();
        if (!VALID_MODES.includes(mode)) {
            return Response.json({ error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` }, { status: 400 });
        }

        const value = {
            mode,
            message: (message || '').toString().slice(0, 280),
            updated_at: new Date().toISOString(),
        };

        const existing = await base44.asServiceRole.entities.AppConfig.filter({ key: 'maintenance_mode' });
        if (existing.length > 0) {
            await base44.asServiceRole.entities.AppConfig.update(existing[0].id, {
                value,
                updated_by: me.wallet_address || me.email,
            });
        } else {
            await base44.asServiceRole.entities.AppConfig.create({
                key: 'maintenance_mode',
                value,
                updated_by: me.wallet_address || me.email,
            });
        }

        return Response.json({ success: true, mode, message: value.message });
    } catch (error) {
        console.error('[setMaintenanceMode]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});