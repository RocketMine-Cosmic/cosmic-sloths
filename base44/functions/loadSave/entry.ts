import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

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
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ saveData: null });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ saveData: null });
        }

        // Try to load by wallet (primary key)
        let records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });
        let saveData = records.length > 0 ? records[0].save_data : null;

        // Migration: if not found by wallet, try legacy lookup by user_id and migrate
        if (!saveData && user.id) {
            console.log('[loadSave] No save for wallet:', wallet, '- attempting legacy migration from user_id:', user.id);
            const legacyRecords = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: user.id });
            if (legacyRecords.length > 0) {
                const legacyData = legacyRecords[0].save_data;
                console.log('[loadSave] Found legacy save - migrating to wallet:', wallet);
                
                // Create new record with wallet_address
                await base44.asServiceRole.entities.PlayerSave.create({
                    wallet_address: wallet,
                    save_data: legacyData,
                    updated_at: Date.now()
                });
                
                // Delete legacy record
                await base44.asServiceRole.entities.PlayerSave.delete(legacyRecords[0].id);
                
                saveData = legacyData;
                console.log('[loadSave] Migration complete for wallet:', wallet);
            }
        }

        console.log('[loadSave] Loaded for wallet:', wallet, '- found:', !!saveData);
        return Response.json({ saveData });
    } catch (error) {
        console.error('[loadSave]', error.message);
        return Response.json({ saveData: null });
    }
});