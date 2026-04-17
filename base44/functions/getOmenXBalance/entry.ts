import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
        return Response.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OMENX_API_KEY');
    const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
    
    if (!apiKey) {
        return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

    const data = await sdk.getPlayerBalances(walletAddress, '56');
    console.log('[getOmenXBalance] raw:', JSON.stringify(data));

    // Find OMENX token — balance is already human-readable (not raw wei)
    const omenxToken = data?.balances?.tokens?.find(t => t.symbol === 'OMENX');
    const balance = parseFloat(omenxToken?.balance ?? '0');

    return Response.json({ balance });
});