import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { action, wallet_address, reason, notes, accessToken, adminKey } = body;

        // Auth: OAuth + manage_blacklist permission, OR emergency admin key
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

            // 'list' is read-only and only requires view_data; mutations require manage_blacklist
            const records = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            const required = action === 'list' ? 'view_data' : 'manage_blacklist';
            if (!perms.includes(required) && !perms.includes('owner')) {
                return Response.json({ error: `Forbidden — '${required}' permission required` }, { status: 403 });
            }
        }

        if (!action) return Response.json({ error: 'action required' }, { status: 400 });

        if (action === 'list') {
            const records = await base44.asServiceRole.entities.BlacklistedWallet.list('-banned_at', 200);
            return Response.json({ records });
        }

        if (!wallet_address) return Response.json({ error: 'wallet_address required' }, { status: 400 });

        if (action === 'ban') {
            if (!reason) return Response.json({ error: 'Reason required for ban' }, { status: 400 });
            const existing = await base44.asServiceRole.entities.BlacklistedWallet.filter({ wallet_address });
            if (existing.length > 0) return Response.json({ error: 'Wallet already banned' }, { status: 409 });
            const record = await base44.asServiceRole.entities.BlacklistedWallet.create({
                wallet_address,
                reason,
                banned_by: callerWallet,
                banned_at: new Date().toISOString(),
                notes: notes || ''
            });
            try {
                await base44.asServiceRole.entities.AdminChangesLog.create({
                    wallet_address: callerWallet,
                    action_type: 'player_action',
                    description: `Banned wallet ${wallet_address}`,
                    details: { wallet: wallet_address, reason, notes }
                });
            } catch {}
            return Response.json({ success: true, record });
        }

        if (action === 'unban') {
            const existing = await base44.asServiceRole.entities.BlacklistedWallet.filter({ wallet_address });
            if (existing.length === 0) return Response.json({ error: 'Wallet not on blacklist' }, { status: 404 });
            await base44.asServiceRole.entities.BlacklistedWallet.delete(existing[0].id);
            try {
                await base44.asServiceRole.entities.AdminChangesLog.create({
                    wallet_address: callerWallet,
                    action_type: 'player_action',
                    description: `Unbanned wallet ${wallet_address}`,
                    details: { wallet: wallet_address }
                });
            } catch {}
            return Response.json({ success: true, message: 'Wallet unbanned' });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});