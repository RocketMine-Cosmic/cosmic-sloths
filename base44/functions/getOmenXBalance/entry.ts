Deno.serve(async (req) => {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
        return Response.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OMENX_API_KEY');
    if (!apiKey) {
        return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const res = await fetch(`https://api.omen.foundation/v1/players/${walletAddress}/balances?chainId=56`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
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