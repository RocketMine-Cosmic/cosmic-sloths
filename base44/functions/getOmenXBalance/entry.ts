import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

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
        if (!apiKey) {
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        const data = await sdk.getPlayerBalances(walletAddress, '56');
        console.log('[getOmenXBalance] raw:', JSON.stringify(data));

        // Find OMENX token — balance is already human-readable (not raw wei)
        const omenxToken = data?.balances?.tokens?.find(t => t.symbol === 'OMENX');
        const balance = parseFloat(omenxToken?.balance ?? '0');

        return Response.json({ balance });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});