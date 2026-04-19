import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const BASE_URL = 'https://staging.api.omen.foundation/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { walletAddress, accessToken } = await req.json();

        if (!walletAddress || !accessToken) {
            return Response.json({ error: 'Missing walletAddress and accessToken' }, { status: 400 });
        }

        // Verify OAuth token and get authenticated wallet
        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) {
            return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        }
        const authenticatedWallet = verifyResult.user.walletAddress;

        // Check if user is admin
        const user = await base44.auth.me();
        let isAdmin = user?.role === 'admin';
        if (!isAdmin && user?.wallet_address) {
            const adminWallets = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: user.wallet_address });
            isAdmin = adminWallets.length > 0;
        }

        // Non-admins can only query their own wallet
        if (!isAdmin && walletAddress !== authenticatedWallet) {
            return Response.json({ error: 'Forbidden: You can only view your own wallet balance' }, { status: 403 });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const authHeader = accessToken
            ? `Bearer ${accessToken}`
            : `Bearer ${apiKey}`;

        // Try several possible endpoints to find the wallet/token balance
        const endpoints = [
            walletAddress ? `${BASE_URL}/wallets/${walletAddress}/balance` : null,
            walletAddress ? `${BASE_URL}/wallets/${walletAddress}` : null,
            `${BASE_URL}/me/wallet`,
            `${BASE_URL}/me/balance`,
            `${BASE_URL}/users/me/wallet`,
        ].filter(Boolean);

        let lastError = null;
        for (const url of endpoints) {
            const res = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                }
            });
            if (res.ok) {
                const data = await res.json();
                return Response.json({ success: true, endpoint: url, ...data });
            }
            const text = await res.text();
            lastError = { url, status: res.status, body: text };
        }

        return Response.json({ error: 'No balance endpoint found', lastError }, { status: 404 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});