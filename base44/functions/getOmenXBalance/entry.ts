import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const GAME_ID = 'cosmic-sloths';

Deno.serve(async (req) => {
    try {
        const { walletAddress, chainId = '56' } = await req.json().catch(() => ({}));

        if (!walletAddress) {
            return Response.json({ balance: null, error: 'No wallet address' });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        if (!apiKey) {
            console.error('[getOmenXBalance] OMENX_API_KEY not set');
            return Response.json({ balance: null, error: 'API key not configured' }, { status: 500 });
        }

        const sdk = new OmenXServerSDK({
            apiKey,
            apiBaseUrl: 'https://staging.api.omen.foundation',
        });

        const balances = await sdk.getPlayerBalances(walletAddress, chainId);
        const balance = balances?.omenx ?? balances?.balance ?? balances?.sparks ?? balances?.tokens ?? null;

        return Response.json({ balance, raw: balances });
    } catch (error) {
        console.error('[getOmenXBalance] Error:', error?.message || error);
        // Return 200 with null balance instead of 500 to allow graceful degradation
        return Response.json({ balance: null, error: error?.message || 'Failed to fetch balance' });
    }
});