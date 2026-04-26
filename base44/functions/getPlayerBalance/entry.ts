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

        const res = await fetch(`${apiBaseUrlEnv}/v1/players/${walletAddress}?chainId=56`, {
            headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
        });
        if (!res.ok) {
            console.error('[getPlayerBalance] HTTP', res.status);
            return Response.json({ balance: 0 });
        }
        const data = await res.json();
        const omenxToken = data?.balances?.tokens?.find(t => t.symbol === 'OMENX');
        const balance = parseFloat(omenxToken?.balance ?? '0');
        return Response.json({ balance });
    } catch (error) {
        console.error('[getPlayerBalance]', error.message);
        return Response.json({ balance: 0 });
    }
});