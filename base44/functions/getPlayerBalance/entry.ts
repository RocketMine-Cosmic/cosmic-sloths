import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lightweight endpoint — balance ONLY. No NFT, no VIP. Called more frequently.
// Auth: Base44 session. Wallet: comes from the linked User.wallet_address.

const balanceCache = new Map();
const BALANCE_CACHE_TTL = 5 * 60 * 1000; // 5 min cache

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ balance: 0 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ balance: 0 });

        const now = Date.now();
        const cachedBalance = balanceCache.get(walletAddress);
        if (cachedBalance && cachedBalance.expiresAt > now) {
            return Response.json({ balance: cachedBalance.balance });
        }

        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;

        const playerDataRes = await fetch(`${apiBaseUrl}/v1/players/${walletAddress}?chainId=56`, {
            headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
        }).then(r => r.ok ? r.json() : null).catch(() => null);

        const omenxToken = playerDataRes?.balances?.tokens?.find(t => t.symbol === 'OMENX');
        const balance = parseFloat(omenxToken?.balance ?? '0');

        balanceCache.set(walletAddress, { balance, expiresAt: now + BALANCE_CACHE_TTL });
        if (balanceCache.size > 1000) {
            for (const [k, v] of balanceCache) { if (v.expiresAt <= now) balanceCache.delete(k); }
        }

        return Response.json({ balance });
    } catch (error) {
        console.error('[getPlayerBalance]', error.message);
        return Response.json({ balance: 0 });
    }
});