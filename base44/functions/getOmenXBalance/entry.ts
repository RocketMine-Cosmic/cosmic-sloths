import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    const { walletAddress, chainId = '56' } = await req.json();

    if (!walletAddress) {
        return Response.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OMENX_API_KEY');
    if (!apiKey) {
        return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const sdk = new OmenXServerSDK({ apiKey });
    const balances = await sdk.getPlayerBalances(walletAddress, chainId);
    
    return Response.json({ balance: balances.balance ?? 0 });
});