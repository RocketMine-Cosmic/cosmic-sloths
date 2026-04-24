import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { action, wallet_address, reason, notes } = await req.json();

        if (!action || !wallet_address) {
            return Response.json({ error: 'Missing action or wallet_address' }, { status: 400 });
        }

        if (action === 'ban') {
            if (!reason) {
                return Response.json({ error: 'Reason required for ban' }, { status: 400 });
            }
            const existing = await base44.asServiceRole.entities.BlacklistedWallet.filter({ wallet_address });
            if (existing.length > 0) {
                return Response.json({ error: 'Wallet already banned' }, { status: 409 });
            }
            const record = await base44.asServiceRole.entities.BlacklistedWallet.create({
                wallet_address,
                reason,
                banned_by: user.email,
                banned_at: new Date().toISOString(),
                notes: notes || ''
            });
            return Response.json({ success: true, record });
        }

        if (action === 'unban') {
            const existing = await base44.asServiceRole.entities.BlacklistedWallet.filter({ wallet_address });
            if (existing.length === 0) {
                return Response.json({ error: 'Wallet not found on blacklist' }, { status: 404 });
            }
            await base44.asServiceRole.entities.BlacklistedWallet.delete(existing[0].id);
            return Response.json({ success: true, message: 'Wallet unbanned' });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});