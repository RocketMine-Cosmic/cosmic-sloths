import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

const verifyCache = new Map();
const VERIFY_CACHE_TTL = 5 * 60 * 1000; // 5 min instead of 1 hour to allow quicker token refreshes

async function verifyToken(sdk, accessToken) {
    const now = Date.now();
    const cached = verifyCache.get(accessToken);
    if (cached && cached.expiresAt > now) return { success: true, walletAddress: cached.walletAddress };
    try {
        const result = await sdk.verifyOAuthUser(accessToken);
        if (result.success) {
            verifyCache.set(accessToken, { walletAddress: result.user.walletAddress, expiresAt: now + VERIFY_CACHE_TTL });
            if (verifyCache.size > 500) {
                for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
            }
        }
        return result.success ? { success: true, walletAddress: result.user.walletAddress } : { success: false };
    } catch (e) {
        // If OmenX API fails, fall back to clientWallet (user already authed on client)
        console.warn('[loadSave] Token verify failed:', e.message);
        return { success: true, walletAddress: null, skipVerify: true };
    }
}

Deno.serve(async (req) => {
    try {
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
            // If OmenX API is down, fall back to clientWallet (user already authed on client)
            if (verifyResult.skipVerify) {
                wallet = clientWallet;
            } else if (!verifyResult.success) {
                return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
            } else {
                wallet = verifyResult.walletAddress;
            }
        }
        
        // Verify wallet matches client claim (skip if we had to skip verify due to API down)
        if (wallet !== clientWallet && !verifyCache.get(accessToken)?.skipVerify) {
            console.warn('[loadSave] Wallet mismatch:', wallet, '≠', clientWallet);
            return Response.json({ error: 'Wallet mismatch' }, { status: 401 });
        }

        const records = await db.entities.PlayerSave.filter({ wallet_address: wallet });
        const saveData = records.length > 0 ? records[0].save_data : null;

        console.log('[loadSave] Loaded for wallet:', wallet, '- found:', !!saveData);
        return Response.json({ saveData });
    } catch (error) {
        console.error('[loadSave]', error.message);
        return Response.json({ saveData: null });
    }
});