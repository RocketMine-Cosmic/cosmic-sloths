import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lightweight endpoint — balance ONLY. No NFT, no VIP. Called more frequently.
const balanceCache = new Map();
const BALANCE_CACHE_TTL = 5 * 60 * 1000; // 5 min cache

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ balance: 0 });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ balance: 0 });
        }

        const now = Date.now();

        // Check balance cache first
        const cachedBalance = balanceCache.get(wallet);
        if (cachedBalance && cachedBalance.expiresAt > now) {
            return Response.json({ balance: cachedBalance.balance });
        }

        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        const playerDataRes = await fetch(`${apiBaseUrl}/v1/players/${wallet}?chainId=56`, {
            headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
        }).then(r => r.ok ? r.json() : null).catch(() => null);

        const omenxToken = playerDataRes?.balances?.tokens?.find(t => t.symbol === 'OMENX');
        const balance = parseFloat(omenxToken?.balance ?? '0');

        // Cache the result
        balanceCache.set(wallet, { balance, expiresAt: now + BALANCE_CACHE_TTL });
        if (balanceCache.size > 1000) {
            for (const [k, v] of balanceCache) { if (v.expiresAt <= now) balanceCache.delete(k); }
        }

        return Response.json({ balance });
    } catch (error) {
        console.error('[getPlayerBalance]', error.message);
        return Response.json({ balance: 0 });
    }
});