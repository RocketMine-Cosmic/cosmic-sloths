import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const verifyCache = new Map();
const saveCache = new Map();
const VERIFY_CACHE_TTL = 60 * 60 * 1000;
const SAVE_CACHE_TTL = 5 * 60 * 1000; // 5 min cache for saves

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
        const base44 = createClientFromRequest(req);
        const { walletAddress: clientWallet, accessToken } = await req.json();

        if (!clientWallet || !accessToken) {
            return Response.json({ saveData: null });
        }

        const now = Date.now();
        // Quick path: if token is in verify cache, skip external OmenX call
        const cachedVerify = verifyCache.get(accessToken);
        let wallet;
        if (cachedVerify && cachedVerify.expiresAt > now) {
            wallet = cachedVerify.walletAddress;
        } else {
            const sdk = new OmenXServerSDK({
                apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
                apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
            });
            const verifyResult = await verifyToken(sdk, accessToken);
            if (!verifyResult.success) {
                return Response.json({ saveData: null });
            }
            wallet = verifyResult.walletAddress;
        }
        const cached = saveCache.get(wallet);
        if (cached && cached.expiresAt > now) {
            console.log('[loadSave] Cache hit for wallet:', wallet);
            return Response.json({ saveData: cached.saveData });
        }

        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });
        const saveData = records.length > 0 ? records[0].save_data : null;

        saveCache.set(wallet, { saveData, expiresAt: now + SAVE_CACHE_TTL });
        if (saveCache.size > 1000) {
            for (const [k, v] of saveCache) { if (v.expiresAt <= now) saveCache.delete(k); }
        }

        console.log('[loadSave] Loaded for wallet:', wallet, '- found:', !!saveData);
        return Response.json({ saveData });
    } catch (error) {
        console.error('[loadSave]', error.message);
        return Response.json({ saveData: null });
    }
});