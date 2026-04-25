// Lightweight endpoint — balance ONLY. No NFT, no VIP. Called more frequently.
const balanceCache = new Map();
const BALANCE_CACHE_TTL = 5 * 60 * 1000; // 5 min cache

function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();

        if (!walletAddress || !accessToken) {
            return Response.json({ balance: 0 });
        }

        // Cross-check wallet against JWT payload (no /v1/oauth/user call)
        const payload = decodeJwtPayload(accessToken);
        const jwtWallet = payload?.walletAddress?.toLowerCase();
        if (jwtWallet && jwtWallet !== walletAddress.toLowerCase()) {
            return Response.json({ balance: 0 });
        }

        const now = Date.now();

        // Check balance cache first
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

        // Cache the result
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