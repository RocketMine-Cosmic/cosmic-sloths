import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const verifyCache = new Map();
const VERIFY_CACHE_TTL = 60 * 60 * 1000;

async function verifyToken(sdk, accessToken) {
    const now = Date.now();
    const cached = verifyCache.get(accessToken);
    if (cached && cached.expiresAt > now) return { success: true, walletAddress: cached.walletAddress };
    const result = await sdk.verifyOAuthUser(accessToken);
    if (result.success) {
        verifyCache.set(accessToken, { walletAddress: result.user.walletAddress, expiresAt: now + VERIFY_CACHE_TTL });
        if (verifyCache.size > 500) {
            for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
        }
    }
    return result.success ? { success: true, walletAddress: result.user.walletAddress } : { success: false };
}

Deno.serve(async (req) => {
    try {
        const { accessToken, walletAddress } = await req.json();
        
        if (!accessToken || !walletAddress) {
            return Response.json({ unlockedCharacters: [] });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });

        const verifyResult = await verifyToken(sdk, accessToken);
        if (!verifyResult.success) {
            return Response.json({ unlockedCharacters: [] });
        }

        // Fetch NFTs from OmenX
        const nfts = await sdk.getPlayerNfts(walletAddress, '56', { limit: 100 });
        
        const nftNames = (nfts || [])
            .map(nft => (nft.name || '').toLowerCase().trim())
            .filter(Boolean);
        
        console.log(`[getNFTCharacters] User has ${nftNames.length} NFTs: ${nftNames.join(', ')}`);

        return Response.json({ unlockedCharacters: nftNames });
    } catch (error) {
        console.error('[getNFTCharacters]', error.message);
        return Response.json({ unlockedCharacters: [] });
    }
});