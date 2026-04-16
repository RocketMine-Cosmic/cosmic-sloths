import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const GAME_ID = 'cosmic-sloths';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { walletAddress, chainId = '56' } = await req.json().catch(() => ({}));

        if (!walletAddress) {
            return Response.json({ balance: null, error: 'No wallet address' });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const sdk = new OmenXServerSDK({
            apiKey,
            apiBaseUrl: 'https://staging.api.omen.foundation',
        });

        const balances = await sdk.getPlayerBalances(walletAddress, chainId);
        // getPlayerBalances returns something like { omenx: number, ... }
        const balance = balances?.omenx ?? balances?.balance ?? balances?.sparks ?? balances?.tokens ?? null;

        return Response.json({ balance, raw: balances });
    } catch (error) {
        return Response.json({ error: error.message, balance: null }, { status: 500 });
    }
});