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

        // Try REST endpoints with different auth methods
        const endpoints = [
            { 
                url: `https://api.omen.foundation/api/v1/wallet/${normalizedWallet}/balance`,
                header: (key) => ({ 'X-API-Key': key })
            },
            { 
                url: `https://staging.api.omen.foundation/api/v1/wallet/${normalizedWallet}/balance`,
                header: (key) => ({ 'X-API-Key': key })
            },
            { 
                url: `https://api.omen.foundation/wallets/${normalizedWallet}`,
                header: (key) => ({ 'Authorization': `Bearer ${key}` })
            },
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`[getOmenXBalance] Trying: ${endpoint.url}`);
                const response = await fetch(endpoint.url, {
                    method: 'GET',
                    headers: {
                        ...endpoint.header(apiKey),
                        'Content-Type': 'application/json',
                    }
                });

                const text = await response.text();
                
                if (response.ok && text) {
                    const data = JSON.parse(text);
                    const balance = data?.omenx ?? data?.balance ?? data?.sparks ?? data?.tokens ?? data?.amount ?? null;
                    if (balance !== null && balance >= 0) {
                        console.log(`[getOmenXBalance] Success from ${endpoint.url}: ${balance}`);
                        return Response.json({ balance, source: 'api' });
                    }
                }
            } catch (e) {
                console.log(`[getOmenXBalance] Endpoint ${endpoint.url} failed: ${e.message}`);
            }
        }

        // Fallback: return a demo balance for testing (remove in production)
        console.warn('[getOmenXBalance] All API endpoints failed, returning demo balance');
        return Response.json({ balance: 100, source: 'demo', warning: 'Using demo balance - API endpoints not accessible' });

    } catch (error) {
        console.error('[getOmenXBalance] Error:', error?.message || error);
        return Response.json({ balance: null, error: error?.message || 'Failed to fetch balance' });
    }
});