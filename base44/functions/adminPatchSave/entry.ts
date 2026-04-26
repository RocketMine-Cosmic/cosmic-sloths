import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { saveId, patch, accessToken, adminKey } = body;

        // Auth: OAuth + edit_players permission, OR emergency admin key
        let callerWallet = 'EMERGENCY_KEY';
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });
            const sdk = new OmenXServerSDK({
                apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
                apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
            });
            const v = await sdk.verifyOAuthUser(accessToken);
            if (!v.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
            callerWallet = v.user?.walletAddress;
            if (!callerWallet) return Response.json({ error: 'No wallet on token' }, { status: 401 });
            const records = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('edit_players') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'edit_players' permission required" }, { status: 403 });
            }
        }

        if (!saveId) return Response.json({ error: 'saveId required' }, { status: 400 });
        if (!patch || typeof patch !== 'object') return Response.json({ error: 'patch object required' }, { status: 400 });

        const existing = await base44.asServiceRole.entities.PlayerSave.get(saveId);
        if (!existing) return Response.json({ error: 'Save not found' }, { status: 404 });

        const currentSave = existing.save_data || {};
        const newSaveData = deepMerge(currentSave, patch);

        const updated = await base44.asServiceRole.entities.PlayerSave.update(saveId, {
            save_data: newSaveData,
            updated_at: Date.now(),
        });

        // Audit log
        try {
            await base44.asServiceRole.entities.AdminChangesLog.create({
                wallet_address: callerWallet,
                action_type: 'player_action',
                description: `Patched save for ${existing.wallet_address}`,
                details: { saveId, target_wallet: existing.wallet_address, patch_keys: Object.keys(patch) },
            });
        } catch (e) { console.error('[adminPatchSave] audit log failed:', e.message); }

        console.log(`[adminPatchSave] ${callerWallet} patched save ${saveId} for ${existing.wallet_address}`);
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