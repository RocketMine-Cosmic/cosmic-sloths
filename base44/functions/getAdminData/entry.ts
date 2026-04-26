import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const { type, walletAddress, accessToken } = await req.json();

        if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const verifiedWallet = verifyResult.user?.walletAddress;
        if (!verifiedWallet) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const adminWallets = await db.entities.AdminWallet.filter({ wallet_address: verifiedWallet });
        if (adminWallets.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });

        if (type === 'pools') {
            const pools = await db.entities.TokenPool.list('-created_date', 100);
            return Response.json({ pools });
        }
        if (type === 'logs') {
            const logs = await db.entities.TokenSpendLog.list('-created_date', 50);
            return Response.json({ logs });
        }
        if (type === 'payouts') {
            const payouts = await db.entities.PayoutLog.list('-created_date', 200);
            return Response.json({ payouts });
        }
        if (type === 'adminWallets') {
            const records = await db.entities.AdminWallet.list('-created_date', 200);
            return Response.json({ records });
        }

        return Response.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        console.error('[getAdminData] Error:', error);
        return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
});