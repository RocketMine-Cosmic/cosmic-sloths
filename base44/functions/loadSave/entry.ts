import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Decode a JWT payload locally (no signature verification — we trust the wallet
// the client sent and only use the JWT to cross-check it). This avoids hitting
// /v1/oauth/user on every load.
function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { walletAddress: clientWallet, accessToken } = await req.json();

        if (!clientWallet || !accessToken) {
            return Response.json({ saveData: null });
        }

        // Cross-check the client-supplied wallet against the JWT payload.
        const payload = decodeJwtPayload(accessToken);
        const jwtWallet = payload?.walletAddress?.toLowerCase();
        const wallet = (jwtWallet || clientWallet).toLowerCase();

        if (jwtWallet && jwtWallet !== clientWallet.toLowerCase()) {
            return Response.json({ error: 'Wallet mismatch' }, { status: 401 });
        }

        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });
        const saveData = records.length > 0 ? records[0].save_data : null;

        console.log('[loadSave] Loaded for wallet:', wallet, '- found:', !!saveData);
        return Response.json({ saveData });
    } catch (error) {
        console.error('[loadSave]', error.message);
        return Response.json({ saveData: null });
    }
});