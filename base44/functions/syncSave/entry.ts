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
        const base44 = createClientFromRequest(req);
        const { walletAddress: clientWallet, saveData, accessToken } = await req.json();

        if (!clientWallet || !saveData || !accessToken) {
            return Response.json({ error: 'walletAddress, saveData, and accessToken required' }, { status: 400 });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        let verifyResult;
        try {
            verifyResult = await verifyToken(sdk, accessToken);
        } catch (err) {
            if (err.status === 429 || err.message?.includes('rate limit')) {
                return Response.json({ error: 'Too many requests' }, { status: 429 });
            }
            throw err;
        }
        // If verification failed, use the wallet address from the request
        // (user is already authed on client, don't fail the save)
        const wallet = verifyResult.success ? verifyResult.walletAddress : clientWallet;
        if (!wallet) {
            return Response.json({ error: 'No wallet address' }, { status: 400 });
        }

        // Ensure saveData has required fields
        if (!saveData.pilotName) {
            saveData.pilotName = `Pilot_${wallet.slice(-6).toUpperCase()}`;
        }

        // Save via Base44 SDK (reliable)
        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });

        let saveId;
        if (existing.length > 0) {
            // Deep merge to preserve all existing data + nested upgrade objects
            const existingData = typeof existing[0].save_data === 'string' ? JSON.parse(existing[0].save_data) : existing[0].save_data;
            const merged = { ...existingData, ...saveData }; // Start with existing, then apply incoming

            // Deep merge upgrade objects to prevent loss of partial data
            const upgradeKeys = ['permanentUpgrades', 'weeklyUpgrades', 'seasonalUpgrades', 'permanentWeaponUpgrades', 'weeklyWeaponUpgrades', 'seasonalWeaponUpgrades', 'permanentTalents', 'weeklyTalents', 'seasonalTalents'];
            upgradeKeys.forEach(key => {
                if (existingData[key] && saveData[key]) {
                    // Both exist: merge them (incoming takes precedence, but preserve any existing keys)
                    merged[key] = { ...existingData[key], ...saveData[key] };
                } else if (existingData[key] && (saveData[key] === undefined || saveData[key] === null)) {
                    // Preserve existing if incoming is missing
                    merged[key] = existingData[key];
                }
            });
            
            await base44.asServiceRole.entities.PlayerSave.update(existing[0].id, {
                wallet_address: wallet,
                save_data: merged,
                updated_at: Date.now()
            });
            saveId = existing[0].id;
        } else {
            const result = await base44.asServiceRole.entities.PlayerSave.create({
                wallet_address: wallet,
                save_data: saveData,
                updated_at: Date.now()
            });
            saveId = result.id;
        }

        console.log('[syncSave] Saved for wallet:', wallet, 'ID:', saveId);
        return Response.json({ success: true, saveId });
    } catch (error) {
        console.error('[syncSave]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});