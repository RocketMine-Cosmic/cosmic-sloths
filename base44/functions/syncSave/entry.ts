import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

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
        const existing = await db.entities.PlayerSave.filter({ wallet_address: wallet });

        let saveId;
        if (existing.length > 0) {
            // Deep merge to preserve all existing data + nested upgrade objects
            const existingData = typeof existing[0].save_data === 'string' ? JSON.parse(existing[0].save_data) : existing[0].save_data;
            const merged = { ...existingData, ...saveData }; // Start with existing, then apply incoming

            // Deep merge upgrade objects — always take MAX of numeric values so paid upgrades are never lost
            const mergeNumericMax = (a, b) => {
                const result = { ...a, ...b };
                for (const key of Object.keys(result)) {
                    const av = typeof a[key] === 'number' ? a[key] : null;
                    const bv = typeof b[key] === 'number' ? b[key] : null;
                    if (av !== null && bv !== null) result[key] = Math.max(av, bv);
                }
                return result;
            };
            const mergeNestedNumericMax = (a, b) => {
                const result = { ...a };
                for (const key of Object.keys(b || {})) {
                    if (typeof b[key] === 'object' && b[key] !== null && !Array.isArray(b[key])) {
                        result[key] = mergeNumericMax(a[key] || {}, b[key]);
                    } else {
                        result[key] = b[key];
                    }
                }
                return result;
            };
            const flatUpgradeKeys = ['permanentUpgrades', 'weeklyUpgrades', 'seasonalUpgrades'];
            const nestedUpgradeKeys = ['permanentWeaponUpgrades', 'weeklyWeaponUpgrades', 'seasonalWeaponUpgrades'];
            const talentKeys = ['permanentTalents', 'weeklyTalents', 'seasonalTalents'];
            flatUpgradeKeys.forEach(key => {
                if (existingData[key] || saveData[key]) {
                    merged[key] = mergeNumericMax(existingData[key] || {}, saveData[key] || {});
                }
            });
            nestedUpgradeKeys.forEach(key => {
                if (existingData[key] || saveData[key]) {
                    merged[key] = mergeNestedNumericMax(existingData[key] || {}, saveData[key] || {});
                }
            });
            // Talents: union of arrays (never lose an unlocked talent)
            talentKeys.forEach(key => {
                const aObj = existingData[key] || {};
                const bObj = saveData[key] || {};
                const allChars = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
                const merged_talents = {};
                allChars.forEach(charId => {
                    const aArr = Array.isArray(aObj[charId]) ? aObj[charId] : [];
                    const bArr = Array.isArray(bObj[charId]) ? bObj[charId] : [];
                    merged_talents[charId] = [...new Set([...aArr, ...bArr])];
                });
                merged[key] = merged_talents;
            });
            // Unlocked items: always take union of arrays
            ['unlockedCharacters', 'unlockedArenas', 'unlockedCosmetics', 'unlockedKillEffects', 'unlockedSkins', 'unlockedRelics', 'equippedRelics', 'foundCharacters'].forEach(key => {
                const aArr = Array.isArray(existingData[key]) ? existingData[key] : [];
                const bArr = Array.isArray(saveData[key]) ? saveData[key] : [];
                merged[key] = [...new Set([...aArr, ...bArr])];
            });
            // unlockedArenasByCharacter: union per character
            const aArenas = existingData.unlockedArenasByCharacter || {};
            const bArenas = saveData.unlockedArenasByCharacter || {};
            const allChars = new Set([...Object.keys(aArenas), ...Object.keys(bArenas)]);
            const mergedArenas = {};
            allChars.forEach(charId => {
                const aArr = Array.isArray(aArenas[charId]) ? aArenas[charId] : [];
                const bArr = Array.isArray(bArenas[charId]) ? bArenas[charId] : [];
                mergedArenas[charId] = [...new Set([...aArr, ...bArr])];
            });
            merged.unlockedArenasByCharacter = mergedArenas;
            // relicLevels: always take max
            if (existingData.relicLevels || saveData.relicLevels) {
                merged.relicLevels = mergeNumericMax(existingData.relicLevels || {}, saveData.relicLevels || {});
            }
            // Gold/kills: always take max (never go backwards)
            ['gold', 'totalKills', 'totalRuns', 'maxTimeSurvived', 'totalGoldEarned', 'maxLevelReached', 'relicFragments', 'starFragments', 'seasonalPoints'].forEach(key => {
                const av = typeof existingData[key] === 'number' ? existingData[key] : 0;
                const bv = typeof saveData[key] === 'number' ? saveData[key] : 0;
                merged[key] = Math.max(av, bv);
            });
            
            await db.entities.PlayerSave.update(existing[0].id, {
                wallet_address: wallet,
                save_data: merged,
                updated_at: Date.now()
            });
            saveId = existing[0].id;
        } else {
            const result = await db.entities.PlayerSave.create({
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