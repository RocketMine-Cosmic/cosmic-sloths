import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { saveId, patch, accessToken } = await req.json();

        if (!saveId) return Response.json({ error: 'saveId required' }, { status: 400 });
        if (!patch || typeof patch !== 'object') return Response.json({ error: 'patch object required' }, { status: 400 });

        // Auth: accept either a valid Base44 admin session OR the admin secret
        const adminSecret = Deno.env.get('AdminDash');
        let authorized = false;

        if (accessToken && adminSecret && accessToken === adminSecret) {
            authorized = true;
        }

        if (!authorized) {
            // Fall back to Base44 user role check
            try {
                const user = await base44.auth.me();
                if (user?.role === 'admin') authorized = true;
            } catch (_) {}
        }

        if (!authorized) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const existing = await base44.asServiceRole.entities.PlayerSave.get(saveId);
        if (!existing) return Response.json({ error: 'Save not found' }, { status: 404 });

        const currentSave = existing.save_data || {};
        const newSaveData = deepMerge(currentSave, patch);

        const updated = await base44.asServiceRole.entities.PlayerSave.update(saveId, {
            save_data: newSaveData,
            updated_at: Date.now(),
        });

        console.log(`[adminPatchSave] Patched save ${saveId} for wallet ${existing.wallet_address}`);
        return Response.json({ success: true, save_data: updated.save_data });
    } catch (error) {
        console.error('[adminPatchSave]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (Array.isArray(source[key])) {
            result[key] = source[key];
        } else if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}