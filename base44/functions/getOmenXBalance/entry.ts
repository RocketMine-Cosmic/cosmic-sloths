Deno.serve(async (req) => {
    const { walletAddress, accessToken } = await req.json();

    if (!walletAddress || !accessToken) {
        return Response.json({ error: 'Wallet address and access token required' }, { status: 400 });
    }

    const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';

    try {
        // Make direct API call with user's OAuth token
        const response = await fetch(`${apiBaseUrl}/v1/players/balances/${walletAddress}/56`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[getOmenXBalance] API error:', response.status, error);
            return Response.json({ error: `API error: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
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