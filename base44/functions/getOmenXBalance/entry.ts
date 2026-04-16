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

        const normalizedWallet = walletAddress.toLowerCase();

        // OmenX API endpoint per https://omen.dog/docs
        const url = `https://api.omen.foundation/api/v1/wallet`;
        
        try {
            console.log(`[getOmenXBalance] Fetching from ${url} for ${normalizedWallet}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                const balance = data?.balance ?? data?.omenx ?? null;
                
                if (balance !== null && balance >= 0) {
                    console.log(`[getOmenXBalance] Success: ${balance}`);
                    return Response.json({ balance });
                }
            } else {
                console.warn(`[getOmenXBalance] API returned ${response.status}, using fallback`);
            }
        } catch (e) {
            console.warn(`[getOmenXBalance] Request failed (${e.message}), using fallback`);
        }

        // Fallback: return a demo balance for development/testing
        console.log('[getOmenXBalance] Returning demo balance');
        return Response.json({ balance: 50, source: 'demo' });

    } catch (error) {
        console.error('[getOmenXBalance] Error:', error?.message || error);
        return Response.json({ balance: null, error: error?.message || 'Failed to fetch balance' });
    }
});