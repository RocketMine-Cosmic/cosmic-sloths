import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns ONLY the live OMENX balance — fast, called frequently after purchases.
// Auth: Base44 session. Wallet: from linked User.wallet_address.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ balance: 0 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ balance: 0 });

        let apiBaseUrlEnv = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrlEnv.startsWith('http')) apiBaseUrlEnv = `https://${apiBaseUrlEnv}`;

        // Load balance across multiple balance API keys (each 100 req/min). Pick one at random
        // per request so concurrent users distribute evenly; on rate-limit (429), try the next.
        const apiKeys = [
            Deno.env.get('OMENX_BALANCE_API_KEY'),
            Deno.env.get('OMENX_BALANCE_API_KEY_2'),
            Deno.env.get('OMENX_BALANCE_API_KEY_3'),
            Deno.env.get('OMENX_BALANCE_API_KEY_4'),
            Deno.env.get('OMENX_BALANCE_API_KEY_5'),
            Deno.env.get('OMENX_BALANCE_API_KEY_6'),
            Deno.env.get('OMENX_BALANCE_API_KEY_7'),
            Deno.env.get('OMENX_BALANCE_API_KEY_8'),
            Deno.env.get('OMENX_BALANCE_API_KEY_9'),
        ].filter(Boolean);

        if (apiKeys.length === 0) {
            console.error('[getPlayerBalance] No balance API keys configured');
            return Response.json({ balance: 0 });
        }

        // Shuffle keys so retries hit different ones
        const shuffled = apiKeys.map(k => ({ k, r: Math.random() })).sort((a, b) => a.r - b.r).map(x => x.k);

        let lastStatus = 0;
        let attempts = 0;
        for (const key of shuffled) {
            attempts++;
            const res = await fetch(`${apiBaseUrlEnv}/v1/players/${walletAddress}?chainId=56`, {
                headers: { 'Authorization': `Bearer ${key}` },
            });
            if (res.ok) {
                const data = await res.json();
                const omenxToken = data?.balances?.tokens?.find(t => t.symbol === 'OMENX');
                const balance = parseFloat(omenxToken?.balance ?? '0');
                console.log(`[getPlayerBalance] wallet=${walletAddress} balance=${balance} attempts=${attempts}`);
                return Response.json({ balance });
            }
            lastStatus = res.status;
            // Only fall through to the next key on rate-limit / server errors. Other errors
            // (e.g. 401/404) won't be fixed by trying another key — bail immediately.
            if (res.status !== 429 && res.status < 500) {
                console.error('[getPlayerBalance] HTTP', res.status, '— not retrying');
                return Response.json({ balance: 0 });
            }
            console.warn('[getPlayerBalance] HTTP', res.status, '— trying next key');
        }
        console.error('[getPlayerBalance] All', shuffled.length, 'keys exhausted, last status:', lastStatus);
        return Response.json({ balance: 0 });
    } catch (error) {
        console.error('[getPlayerBalance]', error.message);
        return Response.json({ balance: 0 });
    }
});