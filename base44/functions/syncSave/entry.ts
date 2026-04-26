import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Syncs the player save for the currently-authenticated Base44 user,
// using the wallet_address linked on their User record. No OmenX token needed —
// Base44 auth is the persistent layer; OmenX wallet is just the data key.

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

        // Ensure pilotName fallback
        if (!saveData.pilotName) {
            saveData.pilotName = `Pilot_${walletLower.slice(-6).toUpperCase()}`;
        }

        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });

        let saveId;
        if (existing.length > 0) {
            const existingData = typeof existing[0].save_data === 'string'
                ? JSON.parse(existing[0].save_data)
                : existing[0].save_data;

            // Determine which side is fresher via the updated_at timestamp the client
            // stamps on every SaveManager.save(). If the incoming client save is OLDER
            // than what's in the cloud, the client is stale (e.g. a long-idle tab that
            // missed a purchase made in another tab) — flip the base merge so cloud
            // wins for non-merged scalar fields like gold, cosmetics, bounties, etc.
            // The MAX/union rules below are commutative so they're unaffected.
            const clientTs = Number(saveData.updated_at || 0);
            const cloudTs = Number(existing[0].updated_at || existingData.updated_at || 0);
            const clientIsStale = cloudTs > 0 && clientTs > 0 && clientTs < cloudTs;
            const merged = clientIsStale
                ? { ...saveData, ...existingData }   // cloud wins (client is stale)
                : { ...existingData, ...saveData };  // client wins (normal)
            if (clientIsStale) {
                console.log(`[syncSave] Stale client detected (client=${clientTs} cloud=${cloudTs}) — cloud wins for scalar fields`);
            }

            // 1. MAX-merge for high-water-mark stats — never lose progress
            const HIGH_WATER_KEYS = [
                'maxTimeSurvived', 'maxLevelReached', 'totalKills', 'totalGoldEarned',
                'relicFragments', 'cosmicTokens', 'seasonalPoints'
            ];
            for (const key of HIGH_WATER_KEYS) {
                const a = Number(existingData[key] || 0);
                const b = Number(saveData[key] || 0);
                merged[key] = Math.max(a, b);
            }

            // 2. Union-merge for unlock arrays — never lose unlocks
            const UNION_ARRAY_KEYS = [
                'unlockedCharacters', 'foundCharacters', 'unlockedRelics',
                'unlockedCosmetics', 'unlockedKillEffects', 'unlockedSkins',
                'encounteredEnemies'
            ];
            for (const key of UNION_ARRAY_KEYS) {
                const a = Array.isArray(existingData[key]) ? existingData[key] : [];
                const b = Array.isArray(saveData[key]) ? saveData[key] : [];
                merged[key] = [...new Set([...a, ...b])];
            }

            // Helper: detect if periodic upgrade containers are from different periods.
            // If so, the client's reset wins (period rolled over) — no MAX merge.
            const periodMismatch = (a, b, idKey) => {
                if (!a || !b || !a[idKey] || !b[idKey]) return false;
                return a[idKey] !== b[idKey];
            };

            // 3. MAX-merge for nested upgrade levels (permanent/weekly/seasonal stats)
            const STAT_UPGRADE_KEYS = [
                { key: 'permanentUpgrades', idKey: null },
                { key: 'weeklyUpgrades', idKey: 'weekId' },
                { key: 'seasonalUpgrades', idKey: 'seasonId' }
            ];
            for (const { key, idKey } of STAT_UPGRADE_KEYS) {
                const a = existingData[key] || {};
                const b = saveData[key] || {};
                // Period rollover → client wins outright (don't preserve old period's levels)
                if (idKey && periodMismatch(a, b, idKey)) {
                    merged[key] = { ...b };
                    continue;
                }
                const out = { ...a, ...b };
                for (const stat of Object.keys({ ...a, ...b })) {
                    if (typeof a[stat] === 'number' || typeof b[stat] === 'number') {
                        out[stat] = Math.max(Number(a[stat] || 0), Number(b[stat] || 0));
                    }
                }
                if (b.weekId) out.weekId = b.weekId;
                if (b.seasonId) out.seasonId = b.seasonId;
                merged[key] = out;
            }

            // 4. MAX-merge for nested-nested weapon upgrade levels
            const WEAPON_UPGRADE_KEYS = [
                { key: 'permanentWeaponUpgrades', idKey: null },
                { key: 'weeklyWeaponUpgrades', idKey: 'weekId' },
                { key: 'seasonalWeaponUpgrades', idKey: 'seasonId' }
            ];
            for (const { key, idKey } of WEAPON_UPGRADE_KEYS) {
                const a = existingData[key] || {};
                const b = saveData[key] || {};
                if (idKey && periodMismatch(a, b, idKey)) {
                    merged[key] = { ...b };
                    continue;
                }
                const out = { ...a, ...b };
                for (const weaponId of Object.keys({ ...a, ...b })) {
                    if (weaponId === 'weekId' || weaponId === 'seasonId') continue;
                    const aw = a[weaponId] || {};
                    const bw = b[weaponId] || {};
                    const wOut = { ...aw, ...bw };
                    for (const stat of Object.keys({ ...aw, ...bw })) {
                        if (typeof aw[stat] === 'number' || typeof bw[stat] === 'number') {
                            wOut[stat] = Math.max(Number(aw[stat] || 0), Number(bw[stat] || 0));
                        }
                    }
                    out[weaponId] = wOut;
                }
                if (b.weekId) out.weekId = b.weekId;
                if (b.seasonId) out.seasonId = b.seasonId;
                merged[key] = out;
            }

            // 5. Union-merge for talents (each character has an array of unlocked talent IDs)
            const TALENT_KEYS = [
                { key: 'permanentTalents', idKey: null },
                { key: 'weeklyTalents', idKey: 'weekId' },
                { key: 'seasonalTalents', idKey: 'seasonId' }
            ];
            for (const { key, idKey } of TALENT_KEYS) {
                const a = existingData[key] || {};
                const b = saveData[key] || {};
                if (idKey && periodMismatch(a, b, idKey)) {
                    merged[key] = { ...b };
                    continue;
                }
                const out = { ...a, ...b };
                for (const charId of Object.keys({ ...a, ...b })) {
                    if (charId === 'weekId' || charId === 'seasonId') continue;
                    const ac = Array.isArray(a[charId]) ? a[charId] : [];
                    const bc = Array.isArray(b[charId]) ? b[charId] : [];
                    out[charId] = [...new Set([...ac, ...bc])];
                }
                if (b.weekId) out.weekId = b.weekId;
                if (b.seasonId) out.seasonId = b.seasonId;
                merged[key] = out;
            }

            // 6. Sum-merge for character kill counts (preserves cumulative count across devices)
            if (existingData.characterKills || saveData.characterKills) {
                const a = existingData.characterKills || {};
                const b = saveData.characterKills || {};
                const out = {};
                for (const charId of new Set([...Object.keys(a), ...Object.keys(b)])) {
                    out[charId] = Math.max(Number(a[charId] || 0), Number(b[charId] || 0));
                }
                merged.characterKills = out;
            }

            // 7. MAX-merge for enemy kill counts
            if (existingData.enemyKills || saveData.enemyKills) {
                const a = existingData.enemyKills || {};
                const b = saveData.enemyKills || {};
                const out = {};
                for (const enemyId of new Set([...Object.keys(a), ...Object.keys(b)])) {
                    out[enemyId] = Math.max(Number(a[enemyId] || 0), Number(b[enemyId] || 0));
                }
                merged.enemyKills = out;
            }

            // 8. MAX-merge for relic levels (upgrades only go up)
            if (existingData.relicLevels || saveData.relicLevels) {
                const a = existingData.relicLevels || {};
                const b = saveData.relicLevels || {};
                const out = {};
                for (const relicId of new Set([...Object.keys(a), ...Object.keys(b)])) {
                    out[relicId] = Math.max(Number(a[relicId] || 0), Number(b[relicId] || 0));
                }
                merged.relicLevels = out;
            }

            // 9. Union-merge unlocked arenas per character
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

            // 10. newGamePlusUnlocked: once true, always true
            merged.newGamePlusUnlocked = !!(existingData.newGamePlusUnlocked || saveData.newGamePlusUnlocked);

            await base44.asServiceRole.entities.PlayerSave.update(existing[0].id, {
                wallet_address: walletLower,
                save_data: merged,
                updated_at: Date.now()
            });
            saveId = existing[0].id;
        } else {
            const result = await base44.asServiceRole.entities.PlayerSave.create({
                wallet_address: walletLower,
                save_data: saveData,
                updated_at: Date.now()
            });
            saveId = result.id;
        }

        console.log('[syncSave] Saved for wallet:', walletLower, 'ID:', saveId);
        return Response.json({ success: true, saveId });
    } catch (error) {
        console.error('[syncSave]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});