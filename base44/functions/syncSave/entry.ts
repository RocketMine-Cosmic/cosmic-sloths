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

// SERVER-OWNED run-aggregate stats (Phase 3c). Cloud is truth.
// Written exclusively by saveScore / claimBounty / claimDailyLogin / submitBossDamage.
const SERVER_OWNED_RUN_STATS = [
    'maxTimeSurvived', 'maxLevelReached', 'totalKills', 'totalGoldEarned',
    'relicFragments', 'cosmicTokens', 'seasonalPoints',
    'starFragments', // Phase 3e — Forge currency
];

// SERVER-OWNED nested aggregates (cloud is truth).
const SERVER_OWNED_NESTED_AGGREGATES = [
    'characterKills',           // { charId: kills }
    'enemyKills',               // { enemyId: kills }
    'unlockedArenasByCharacter',// { charId: [arenaIds] }
];

// Discovery arrays — server-owned (cloud only).
const SERVER_OWNED_DISCOVERY = [
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
        // Only log meaningful staleness (>5s gap). Sub-5s gaps are almost always
        // races with concurrent server-side writes (saveScore, claimBounty, etc.)
        // landing milliseconds before the debounced client sync — not actionable.
        if (clientIsStale && (cloudTs - clientTs) > 5000) {
            console.log(`[syncSave] Stale client (client=${clientTs} cloud=${cloudTs}) — cloud wins for scalars`);
        }

        // Base merge (scalars + non-categorised fields). For server-owned categories
        // we override below regardless of stale state.
        const merged = clientIsStale
            ? { ...saveData, ...existingData }
            : { ...existingData, ...saveData };

        // Client-owned audio prefs: always trust the latest client write.
        // These are pure UI prefs (no anti-cheat concern) and the stale-client
        // guard above would otherwise wipe them when the cloud has an older copy.
        if (saveData.jukeboxPrefs && typeof saveData.jukeboxPrefs === 'object') {
            merged.jukeboxPrefs = saveData.jukeboxPrefs;
        }
        if (saveData.sfxCategories && typeof saveData.sfxCategories === 'object') {
            merged.sfxCategories = saveData.sfxCategories;
        }

        // Collect anti-cheat blocks for audit logging at the end. Each entry becomes
        // a SyncBlockLog row so admins can review and refund false-positives.
        const blocks = [];
        const recordBlock = (field, clientVal, cloudVal, notes) => {
            blocks.push({
                wallet_address: walletLower,
                field,
                client_value: Number(clientVal) || 0,
                cloud_value: Number(cloudVal) || 0,
                client_ts: clientTs,
                cloud_ts: cloudTs,
                client_was_stale: clientIsStale,
                notes: notes || ''
            });
        };

        // --- 1. SERVER-OWNED unlock arrays: cloud only. Ignore client. ---
        for (const key of SERVER_OWNED_UNLOCK_ARRAYS) {
            const cloudArr = Array.isArray(existingData[key]) ? existingData[key] : [];
            merged[key] = [...cloudArr];
            // Detect attempted client-side injection (log but don't block).
            const clientArr = Array.isArray(saveData[key]) ? saveData[key] : [];
            const injected = clientArr.filter(id => !cloudArr.includes(id));
            if (injected.length > 0) {
                console.warn(`[syncSave] BLOCKED client-side ${key} injection from ${walletLower}: ${JSON.stringify(injected)}`);
                recordBlock(key, injected.length, cloudArr.length, `array_injection: ${injected.join(',')}`);
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
                    recordBlock(`${key}.${stat}`, clientObj[stat], cloudObj[stat] || 0, 'upgrade_level_bump');
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

        // --- 6. SERVER-OWNED run-aggregate stats: cloud only (Phase 3c) ---
        for (const key of SERVER_OWNED_RUN_STATS) {
            merged[key] = Number(existingData[key] || 0);
            const clientVal = Number(saveData[key] || 0);
            if (clientVal > merged[key]) {
                console.warn(`[syncSave] BLOCKED ${key} bump from ${walletLower}: client=${clientVal} cloud=${merged[key]}`);
                recordBlock(key, clientVal, merged[key], 'run_stat_bump');
            }
        }

        // --- 7. Gold: SERVER-OWNED. Cloud only. Granted via spendGold/saveScore/claimBounty/claimDailyLogin etc. ---
        merged.gold = Number(existingData.gold || 0);
        const clientGold = Number(saveData.gold || 0);
        if (clientGold > merged.gold) {
            console.warn(`[syncSave] BLOCKED gold bump from ${walletLower}: client=${clientGold} cloud=${merged.gold}`);
            recordBlock('gold', clientGold, merged.gold, 'gold_bump');
        }

        // --- 8. SERVER-OWNED discovery arrays: cloud only ---
        for (const key of SERVER_OWNED_DISCOVERY) {
            merged[key] = Array.isArray(existingData[key]) ? [...existingData[key]] : [];
        }

        // --- 9-10. SERVER-OWNED nested aggregates (kills, arena unlocks): cloud only ---
        for (const key of SERVER_OWNED_NESTED_AGGREGATES) {
            merged[key] = existingData[key] ? JSON.parse(JSON.stringify(existingData[key])) : {};
        }

        // --- 11. NG+ unlock: server-owned (granted by saveScore on final-arena victory) ---
        merged.newGamePlusUnlocked = !!existingData.newGamePlusUnlocked;

        // --- 12. SERVER-OWNED Forge augments + daily convert ledger (Phase 3e) ---
        merged.forgeWeaponAugments = existingData.forgeWeaponAugments
            ? JSON.parse(JSON.stringify(existingData.forgeWeaponAugments)) : {};
        merged.forgeCharAugments = existingData.forgeCharAugments
            ? JSON.parse(JSON.stringify(existingData.forgeCharAugments)) : {};
        merged.forgeConvertedToday = existingData.forgeConvertedToday
            ? { ...existingData.forgeConvertedToday } : { date: '', count: 0 };

        // --- 13. SERVER-OWNED bounty progress (Phase 3f) ---
        // Cloud writes are exclusive: saveScore (progress) + claimBounty (claimed/reward).
        // Client may rotate the bounty list locally on a new day; we accept the LIST
        // from the client only when it's a new day reset. Otherwise cloud wins.
        // Client uses `date` (set in SaveManager.load); some legacy records may use `lastReset`.
        const cloudBounties = existingData.bounties || null;
        const clientBounties = saveData.bounties || null;
        const bountyDateOf = (b) => (b && (b.date || b.lastReset)) || null;
        const cloudDate = bountyDateOf(cloudBounties);
        const clientDate = bountyDateOf(clientBounties);
        if (cloudBounties && clientBounties && cloudDate && clientDate && cloudDate === clientDate) {
            // Same day — cloud is truth (server already tracked progress).
            merged.bounties = JSON.parse(JSON.stringify(cloudBounties));
        } else if (clientBounties && clientDate) {
            // Client rolled to a new day — accept the new structure but null-out
            // progress/claimed so server can re-track from zero.
            const fresh = JSON.parse(JSON.stringify(clientBounties));
            if (Array.isArray(fresh.active)) {
                fresh.active = fresh.active.map(b => ({ ...b, progress: 0, claimed: false }));
            }
            if (fresh.dailyMission) {
                fresh.dailyMission = { ...fresh.dailyMission, progress: 0, claimed: false };
            }
            merged.bounties = fresh;
        } else {
            merged.bounties = cloudBounties;
        }

        const newTs = Date.now();
        merged.updated_at = newTs;

        // PRIVACY/AUTHORITY: player_name on PlayerSave is the source of truth for
        // every leaderboard display. The client must NEVER overwrite it via syncSave —
        // that path is reserved for the explicit Profile-page flow (`syncProfileName`)
        // which also cascades the new name to RunScore / SquadMember / etc.
        // syncSave preserves whatever the cloud already had to prevent stale local
        // state (e.g. an old `pilotName` field carrying the OAuth full_name) from
        // leaking back into the database and onto the leaderboard.
        const cloudName = (existing[0].player_name || existingData.player_name || existingData.pilotName || '').trim();
        const preservedName = cloudName || merged.player_name || merged.pilotName || '';
        // Mirror the preserved name back into save_data so the next saveScore call
        // reads a consistent value.
        merged.player_name = preservedName;

        await base44.asServiceRole.entities.PlayerSave.update(existing[0].id, {
            wallet_address: walletLower,
            player_name: preservedName,
            save_data: merged,
            updated_at: newTs
        });

        // Audit log: persist any blocks so admins can review/refund. Non-fatal —
        // a logging failure must never affect the sync itself.
        if (blocks.length > 0) {
            try {
                await base44.asServiceRole.entities.SyncBlockLog.bulkCreate(blocks);
            } catch (err) {
                console.error('[syncSave] SyncBlockLog write failed (non-fatal):', err.message);
            }
        }

        // Return merged save + new timestamp so client can adopt it and break the
        // "stale client → cloud bumps timestamp → still stale" sync loop.
        return Response.json({ success: true, saveId: existing[0].id, saveData: merged, updated_at: newTs });
    } catch (error) {
        console.error('[syncSave]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});