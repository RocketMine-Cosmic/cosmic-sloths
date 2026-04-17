import { OmenXGameSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    const { walletAddress, accessToken } = await req.json();

    if (!walletAddress || !accessToken) {
        return Response.json({ error: 'Wallet address and access token required' }, { status: 400 });
    }

    const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';

    // Use OAuth client SDK with user's access token
    const sdk = new OmenXGameSDK({
        gameId: 'cosmic-sloths',
        apiBaseUrl
    });

    try {
        const data = await sdk.getPlayerBalances(walletAddress, '56', { accessToken });
        console.log('[getOmenXBalance] raw:', JSON.stringify(data));

        // Find OMENX token — balance is already human-readable (not raw wei)
        const omenxToken = data?.balances?.tokens?.find(t => t.symbol === 'OMENX');
        const balance = parseFloat(omenxToken?.balance ?? '0');

        return Response.json({ balance });
    } catch (error) {
        console.error('[getOmenXBalance] error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});