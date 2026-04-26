import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Syncs the player save for the currently-authenticated Base44 user.
// Wallet is read from User.wallet_address (linked at login). No OmenX token needed.
//
// Phase 3a: SERVER-OWNED unlock arrays + upgrade levels are CLOUD-AUTHORITATIVE.
// The client cannot add new entries to them via syncSave — those grants must come
// from dedicated server endpoints (purchaseSku, claimBounty, saveScore, etc.).
// Currencies and run totals are still MAX-merged for now (locked in Phase 3c).

// ---- Field categorisation ----

// Unlocks: cloud is the truth. Client values are IGNORED.
// (They get added by server-side grant endpoints only.)
const SERVER_OWNED_UNLOCK_ARRAYS = [
    'unlockedCharacters',
    'unlockedRelics',
    'unlockedCosmetics',
    'unlockedKillEffects',
    'unlockedSkins',
];

// Upgrade levels: cloud is the truth (granted via purchaseSku / spendGold in 3b).
// Each is a flat object of stat → level.
const SERVER_OWNED_UPGRADE_OBJECTS = [
    'permanentUpgrades',
    'weeklyUpgrades',
    'seasonalUpgrades',
];

// Weapon upgrade levels (nested: weaponId → stat → level). Cloud is truth.
const SERVER_OWNED_WEAPON_OBJECTS = [
    'permanentWeaponUpgrades',
    'weeklyWeaponUpgrades',
    'seasonalWeaponUpgrades',
];

// Talents (nested: charId → [talentIds]). Cloud is truth.
const SERVER_OWNED_TALENT_OBJECTS = [
    'permanentTalents',
    'weeklyTalents',
    'seasonalTalents',
];

// Relic levels (relicId → level). Cloud is truth.
const SERVER_OWNED_NUMBER_MAPS = [
    'relicLevels',
];

// High-water-mark stats — MAX-merge keeps highest seen (still mostly client-fed
// until Phase 3c, but cap-merge prevents loss).
const HIGH_WATER_KEYS = [
    'maxTimeSurvived', 'maxLevelReached', 'totalKills', 'totalGoldEarned',
    'relicFragments', 'cosmicTokens', 'seasonalPoints'
];

// Discovery arrays — union-merge (no cheat impact: they unlock lore only).
const UNION_DISCOVERY_ARRAYS = [
    'foundCharacters',
    'encounteredEnemies',
];

// Helper: detect if a periodic upgrade container has rolled to a new period.
// If so, the client's reset wins outright.
const periodMismatch = (a, b, idKey) => {
    if (!a || !b || !a[idKey] || !b[idKey]) return false;
    return a[idKey] !== b[idKey];
};

// Period roll: when client OR cloud has advanced to a new period, weekly/seasonal
// upgrade containers reset to the newer period and zero out previous values.
function resolvePeriodicUpgradeContainer(cloudVal, clientVal, idKey) {
    const c = cloudVal || {};
    const x = clientVal || {};
    if (!idKey) return c; // permanent: cloud wins, no period
    const cloudId = c[idKey];
    const clientId = x[idKey];
    // Both same period — cloud is truth (server-owned).
    if (cloudId === clientId) return c;
    // Neither has an id — keep cloud.
    if (!cloudId && !clientId) return c;
    // Different periods: take whichever id is "newer" (lexicographic works for
    // YYYY-Www and YYYY-Sn formats). Reset levels for that period.
    const newerId = (clientId || '') > (cloudId || '') ? clientId : cloudId;
    return { [idKey]: newerId };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const wallet = me.wallet_address;
        if (!wallet) {
            return Response.json({ error: 'No wallet linked to user' }, { status: 400 });
        }

        const { saveData } = await req.json();
        if (!saveData) return Response.json({ error: 'saveData required' }, { status: 400 });

        const walletLower = wallet.toLowerCase();
        if (!saveData.pilotName) {
            saveData.pilotName = `Pilot_${walletLower.slice(-6).toUpperCase()}`;
        }

        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });

        // --- New player: just save what they sent. No grants to protect yet. ---
        if (existing.length === 0) {
            const result = await base44.asServiceRole.entities.PlayerSave.create({
                wallet_address: walletLower,
                player_name: saveData.player_name || saveData.pilotName || '',
                save_data: saveData,
                updated_at: Date.now()
            });
            return Response.json({ success: true, saveId: result.id });
        }

        const existingData = typeof existing[0].save_data === 'string'
            ? JSON.parse(existing[0].save_data)
            : existing[0].save_data;

        // --- Stale-client guard ---
        const clientTs = Number(saveData.updated_at || 0);
        const cloudTs = Number(existing[0].updated_at || existingData.updated_at || 0);
        const clientIsStale = cloudTs > 0 && clientTs > 0 && clientTs < cloudTs;
        if (clientIsStale) {
            console.log(`[syncSave] Stale client (client=${clientTs} cloud=${cloudTs}) — cloud wins for scalars`);
        }

        // Base merge (scalars + non-categorised fields). For server-owned categories
        // we override below regardless of stale state.
        const merged = clientIsStale
            ? { ...saveData, ...existingData }
            : { ...existingData, ...saveData };

        // --- 1. SERVER-OWNED unlock arrays: cloud only. Ignore client. ---
        for (const key of SERVER_OWNED_UNLOCK_ARRAYS) {
            const cloudArr = Array.isArray(existingData[key]) ? existingData[key] : [];
            merged[key] = [...cloudArr];
            // Detect attempted client-side injection (log but don't block).
            const clientArr = Array.isArray(saveData[key]) ? saveData[key] : [];
            const injected = clientArr.filter(id => !cloudArr.includes(id));
            if (injected.length > 0) {
                console.warn(`[syncSave] BLOCKED client-side ${key} injection from ${walletLower}: ${JSON.stringify(injected)}`);
            }
        }

        // --- 2. SERVER-OWNED upgrade level objects: cloud only (with period roll) ---
        for (const key of SERVER_OWNED_UPGRADE_OBJECTS) {
            const idKey = key === 'permanentUpgrades' ? null
                : key === 'weeklyUpgrades' ? 'weekId'
                : 'seasonId';
            merged[key] = resolvePeriodicUpgradeContainer(existingData[key], saveData[key], idKey);
            // Log injection attempt
            const cloudObj = existingData[key] || {};
            const clientObj = saveData[key] || {};
            for (const stat of Object.keys(clientObj)) {
                if (stat === 'weekId' || stat === 'seasonId') continue;
                if (Number(clientObj[stat] || 0) > Number(cloudObj[stat] || 0)) {
                    console.warn(`[syncSave] BLOCKED ${key}.${stat} bump from ${walletLower}: client=${clientObj[stat]} cloud=${cloudObj[stat] || 0}`);
                }
            }
        }

        // --- 3. SERVER-OWNED weapon upgrades: cloud only (with period roll) ---
        for (const key of SERVER_OWNED_WEAPON_OBJECTS) {
            const idKey = key === 'permanentWeaponUpgrades' ? null
                : key === 'weeklyWeaponUpgrades' ? 'weekId'
                : 'seasonId';
            merged[key] = resolvePeriodicUpgradeContainer(existingData[key], saveData[key], idKey);
        }

        // --- 4. SERVER-OWNED talents: cloud only (with period roll) ---
        for (const key of SERVER_OWNED_TALENT_OBJECTS) {
            const idKey = key === 'permanentTalents' ? null
                : key === 'weeklyTalents' ? 'weekId'
                : 'seasonId';
            merged[key] = resolvePeriodicUpgradeContainer(existingData[key], saveData[key], idKey);
        }

        // --- 5. SERVER-OWNED number maps (relicLevels): cloud only ---
        for (const key of SERVER_OWNED_NUMBER_MAPS) {
            merged[key] = { ...(existingData[key] || {}) };
        }

        // --- 6. High-water-mark stats: MAX-merge (still client-fed, locked in 3c) ---
        for (const key of HIGH_WATER_KEYS) {
            const a = Number(existingData[key] || 0);
            const b = Number(saveData[key] || 0);
            merged[key] = Math.max(a, b);
        }

        // --- 7. Gold: SERVER-OWNED. Cloud only. Granted via spendGold/saveScore/claimBounty/claimDailyLogin etc. ---
        merged.gold = Number(existingData.gold || 0);
        const clientGold = Number(saveData.gold || 0);
        if (clientGold > merged.gold) {
            console.warn(`[syncSave] BLOCKED gold bump from ${walletLower}: client=${clientGold} cloud=${merged.gold}`);
        }

        // --- 8. Discovery arrays: union (lore only, no cheat impact) ---
        for (const key of UNION_DISCOVERY_ARRAYS) {
            const a = Array.isArray(existingData[key]) ? existingData[key] : [];
            const b = Array.isArray(saveData[key]) ? saveData[key] : [];
            merged[key] = [...new Set([...a, ...b])];
        }

        // --- 9. Sum-merge character / enemy kill counts (MAX, since each device
        // accumulates the full count not deltas) ---
        if (existingData.characterKills || saveData.characterKills) {
            const a = existingData.characterKills || {};
            const b = saveData.characterKills || {};
            const out = {};
            for (const charId of new Set([...Object.keys(a), ...Object.keys(b)])) {
                out[charId] = Math.max(Number(a[charId] || 0), Number(b[charId] || 0));
            }
            merged.characterKills = out;
        }
        if (existingData.enemyKills || saveData.enemyKills) {
            const a = existingData.enemyKills || {};
            const b = saveData.enemyKills || {};
            const out = {};
            for (const enemyId of new Set([...Object.keys(a), ...Object.keys(b)])) {
                out[enemyId] = Math.max(Number(a[enemyId] || 0), Number(b[enemyId] || 0));
            }
            merged.enemyKills = out;
        }

        // --- 10. unlockedArenasByCharacter: union per character (lore-tier unlocks
        // gated by run completion in saveScore — locked properly in 3c). ---
        if (existingData.unlockedArenasByCharacter || saveData.unlockedArenasByCharacter) {
            const a = existingData.unlockedArenasByCharacter || {};
            const b = saveData.unlockedArenasByCharacter || {};
            const out = { ...a, ...b };
            for (const charId of new Set([...Object.keys(a), ...Object.keys(b)])) {
                const ac = Array.isArray(a[charId]) ? a[charId] : [];
                const bc = Array.isArray(b[charId]) ? b[charId] : [];
                out[charId] = [...new Set([...ac, ...bc])];
            }
            merged.unlockedArenasByCharacter = out;
        }

        // --- 11. NG+ unlock: once true, always true ---
        merged.newGamePlusUnlocked = !!(existingData.newGamePlusUnlocked || saveData.newGamePlusUnlocked);

        await base44.asServiceRole.entities.PlayerSave.update(existing[0].id, {
            wallet_address: walletLower,
            player_name: merged.player_name || merged.pilotName || '',
            save_data: merged,
            updated_at: Date.now()
        });

        return Response.json({ success: true, saveId: existing[0].id });
    } catch (error) {
        console.error('[syncSave]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});