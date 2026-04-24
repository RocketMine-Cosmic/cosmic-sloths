import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Admin only
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { walletAddresses } = body;

        if (!walletAddresses || !Array.isArray(walletAddresses) || walletAddresses.length === 0) {
            return Response.json({ error: 'walletAddresses array required' }, { status: 400 });
        }

        console.log(`[recoverPlayerSaves] Recovering ${walletAddresses.length} wallets`);

        const results = {
            recovered: [],
            errors: []
        };

        for (const wallet of walletAddresses) {
            try {
                // Reset to default save (clears corrupted upgrade data)
                const defaultSave = {
                    gold: 5000,
                    relicFragments: 50,
                    unlockedCharacters: ['neobyte'],
                    foundCharacters: [],
                    unlockedArenasByCharacter: { neobyte: ['station'] },
                    permanentUpgrades: { damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 },
                    weeklyUpgrades: { damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 },
                    seasonalUpgrades: { damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 },
                    permanentWeaponUpgrades: {},
                    weeklyWeaponUpgrades: {},
                    seasonalWeaponUpgrades: {},
                    permanentTalents: {},
                    weeklyTalents: {},
                    seasonalTalents: {},
                    cosmetics: { trail: 'default' },
                    unlockedCosmetics: ['default'],
                    maxTimeSurvived: 0,
                    totalKills: 0,
                    totalGoldEarned: 0,
                    maxLevelReached: 0,
                    bounties: { date: '', active: [], dailyMission: null },
                    seasonalPoints: 0,
                    encounteredEnemies: [],
                    enemyKills: {},
                    bossModifiers: {},
                    newGamePlusUnlocked: false,
                    isNGPlus: false,
                    unlockedRelics: [],
                    equippedRelics: []
                };

                // Find and update their save
                const saves = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });
                if (saves && saves.length > 0) {
                    await base44.asServiceRole.entities.PlayerSave.update(saves[0].id, {
                        save_data: defaultSave,
                        updated_at: Date.now()
                    });
                    results.recovered.push(wallet);
                    console.log(`[recoverPlayerSaves] Recovered ${wallet}`);
                } else {
                    // No save exists, create one
                    await base44.asServiceRole.entities.PlayerSave.create({
                        wallet_address: wallet,
                        save_data: defaultSave,
                        updated_at: Date.now()
                    });
                    results.recovered.push(wallet);
                    console.log(`[recoverPlayerSaves] Created new save for ${wallet}`);
                }
            } catch (e) {
                results.errors.push({ wallet, reason: e.message });
                console.error(`[recoverPlayerSaves] Error for ${wallet}:`, e.message);
            }
        }

        console.log(`[recoverPlayerSaves] Complete: recovered=${results.recovered.length}, errors=${results.errors.length}`);
        return Response.json({ success: true, ...results });
    } catch (error) {
        console.error('[recoverPlayerSaves]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});