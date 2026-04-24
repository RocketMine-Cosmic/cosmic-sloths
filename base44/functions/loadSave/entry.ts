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
        const { walletAddress: clientWallet, accessToken } = await req.json();

        if (!clientWallet) {
            return Response.json({ saveData: null });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await verifyToken(sdk, accessToken || '');
        if (!verifyResult.success) {
            console.log('[loadSave] Token verification skipped or failed, returning null');
            return Response.json({ saveData: null });
        }

        console.log('[loadSave] Token verified for wallet:', verifyResult.walletAddress);
        return Response.json({ saveData: null });
    } catch (error) {
        console.error('[loadSave]', error.message);
        return Response.json({ saveData: null });
    }
});