Deno.serve(async (req) => {
    const { walletAddress, accessToken, chainId = '56' } = await req.json();

    if (!walletAddress) {
        return Response.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OMENX_API_KEY');
    if (!apiKey) {
        return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Use the user's access token if available, otherwise fall back to API key
    const authToken = accessToken || apiKey;

    const res = await fetch(`https://api.omen.foundation/v1/wallet/${walletAddress}/balances?chainId=${chainId}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('[getOmenXBalance] API error:', res.status, err);
        return Response.json({ error: 'Failed to fetch balance', detail: err }, { status: res.status });
    }

    const data = await res.json();
    console.log('[getOmenXBalance] raw:', JSON.stringify(data));

    // Find OMENX token in the tokens array
    const omenxToken = data?.balances?.tokens?.find(t => t.symbol === 'OMENX');
    const rawBalance = omenxToken?.balance ?? '0';
    const balance = parseFloat(rawBalance) / 1e18;

    return Response.json({ balance });
});