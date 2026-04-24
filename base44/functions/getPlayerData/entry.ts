import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Heavy endpoint — NFT + VIP ONLY. Called once per session.
const verifyCache = new Map();
const VERIFY_TTL = 60 * 60 * 1000;

Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();

        if (!walletAddress || !accessToken) {
            return Response.json({ vipLevel: 0, nfts: [] });
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
            if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
            authenticatedWallet = verifyResult.user.walletAddress;
            verifyCache.set(accessToken, { walletAddress: authenticatedWallet, expiresAt: now + VERIFY_TTL });
            if (verifyCache.size > 500) {
                for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
            }
        }

        if (walletAddress !== authenticatedWallet) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        const [playerDataRes, bonusLevel] = await Promise.all([
            fetch(`${apiBaseUrl}/v1/players/${walletAddress}?chainId=56`, {
                headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
            }).then(r => r.ok ? r.json() : null).catch((e) => {
                console.error('[getPlayerData] playerDataRes fetch failed:', e.message);
                return null;
            }),
            sdk.getPlayerGameBonusPointsLevel(walletAddress).catch((e) => {
                console.error('[getPlayerData] bonusLevel fetch failed:', e.message);
                return null;
            }),
        ]);

        // Only return zero if BOTH calls definitively failed AND we have no fallback
        const vipLevel = bonusLevel === null ? 0 : bonusLevel;
        const nfts = playerDataRes?.nfts || [];

        console.log(`[getPlayerData] wallet=${walletAddress} vipLevel=${vipLevel} nfts=${nfts.length}`);
        return Response.json({ vipLevel, nfts });
    } catch (error) {
        console.error('[getPlayerData]', error.message);
        return Response.json({ vipLevel: 0, nfts: [] });
    }
});