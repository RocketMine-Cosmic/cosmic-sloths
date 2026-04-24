import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Lightweight endpoint — balance ONLY. No NFT, no VIP. Called more frequently.
const verifyCache = new Map();
const VERIFY_TTL = 60 * 60 * 1000;

Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();

        if (!walletAddress || !accessToken) {
            return Response.json({ balance: 0 });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });

        // Cached token verify
        const now = Date.now();
        const cached = verifyCache.get(accessToken);
        let authenticatedWallet;
        if (cached && cached.expiresAt > now) {
            authenticatedWallet = cached.walletAddress;
        } else {
            const verifyResult = await sdk.verifyOAuthUser(accessToken);
            if (!verifyResult.success) return Response.json({ balance: 0 });
            authenticatedWallet = verifyResult.user.walletAddress;
            verifyCache.set(accessToken, { walletAddress: authenticatedWallet, expiresAt: now + VERIFY_TTL });
            if (verifyCache.size > 500) {
                for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
            }
        }

        if (walletAddress !== authenticatedWallet) return Response.json({ balance: 0 });

        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        const playerDataRes = await fetch(`${apiBaseUrl}/v1/players/${walletAddress}?chainId=56`, {
            headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
        }).then(r => r.ok ? r.json() : null).catch(() => null);

        const omenxToken = playerDataRes?.balances?.tokens?.find(t => t.symbol === 'OMENX');
        const balance = parseFloat(omenxToken?.balance ?? '0');

        return Response.json({ balance });
    } catch (error) {
        console.error('[getPlayerBalance]', error.message);
        return Response.json({ balance: 0 });
    }
});