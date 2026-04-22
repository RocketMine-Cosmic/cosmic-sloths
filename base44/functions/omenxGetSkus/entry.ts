import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

const BASE_URL = 'https://api.omen.foundation/v1';

Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();
        if (!walletAddress || !accessToken) {
            return Response.json({ error: 'Missing walletAddress and accessToken' }, { status: 400 });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_PAYMENT_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });

        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) {
            return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        }
        const authenticatedWallet = verifyResult.user.walletAddress;

        if (walletAddress !== authenticatedWallet) {
            return Response.json({ error: 'Forbidden: Wallet mismatch' }, { status: 403 });
        }

        const adminWallets = await db.entities.AdminWallet.filter({ wallet_address: walletAddress });
        if (adminWallets.length === 0) {
            return Response.json({ error: 'Forbidden: Admin wallet required' }, { status: 403 });
        }

        const apiKey = Deno.env.get('OMENX_PAYMENT_API_KEY');
        const res = await fetch(`${BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const text = await res.text();
        let results;
        try { results = JSON.parse(text); } catch { results = text; }

        return Response.json(results);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});