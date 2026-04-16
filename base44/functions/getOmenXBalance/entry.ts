import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

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

        const sdk = new OmenXServerSDK({ apiKey });

        try {
            console.log(`[getOmenXBalance] Fetching balance for ${walletAddress} on chain ${chainId}`);
            const balances = await sdk.getPlayerBalances(walletAddress, chainId);
            
            if (balances && typeof balances.balance === 'number') {
                console.log(`[getOmenXBalance] Success: ${balances.balance}`);
                return Response.json({ balance: balances.balance });
            }
            
            console.warn('[getOmenXBalance] No balance in response:', balances);
        } catch (e) {
            console.error(`[getOmenXBalance] SDK error: ${e.message}`);
        }

        // Fallback: return a demo balance for development/testing
        console.log('[getOmenXBalance] Returning demo balance');
        return Response.json({ balance: 50, source: 'demo' });

    } catch (error) {
        console.error('[getOmenXBalance] Error:', error?.message || error);
        return Response.json({ balance: null, error: error?.message || 'Failed to fetch balance' });
    }
});