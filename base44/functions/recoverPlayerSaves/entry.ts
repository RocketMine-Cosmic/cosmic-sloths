import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all spend logs
        const spendLogs = await base44.asServiceRole.entities.TokenSpendLog.filter({}, '-created_date', 500);
        
        // Group by wallet
        const spendByWallet = new Map();
        for (const log of spendLogs) {
            if (!spendByWallet.has(log.wallet_address)) {
                spendByWallet.set(log.wallet_address, []);
            }
            spendByWallet.get(log.wallet_address).push(log);
        }

        let recovered = 0;
        const errors = [];

        // For each wallet with spend logs, rebuild their save
        for (const [wallet, spends] of spendByWallet.entries()) {
            try {
                const playerSaves = await base44.asServiceRole.entities.PlayerSave.filter({ 
                    wallet_address: wallet 
                });

                if (playerSaves.length === 0) continue;

                const save = playerSaves[0];
                let saveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data || {};

                // Force reset corrupted structure — create fresh save with minimal data
                const cleanSave = {
                    pilotName: `Pilot_${wallet.slice(-6).toUpperCase()}`,
                    gold: saveData?.gold || 0,
                    totalKills: saveData?.totalKills || 0,
                    maxTimeSurvived: saveData?.maxTimeSurvived || 0,
                    totalGoldEarned: saveData?.totalGoldEarned || 0,
                    maxLevelReached: saveData?.maxLevelReached || 0,
                    permanentUpgrades: {},
                    weeklyUpgrades: {},
                    seasonalUpgrades: {},
                    unlockedCharacters: saveData?.unlockedCharacters || ['neobyte'],
                    cosmetics: saveData?.cosmetics || { trail: 'default', killEffect: 'none' },
                    hasSetProfileName: true
                };

                // Award tokens spent as gold (compensation for lost upgrades)
                const totalSpent = spends.reduce((sum, log) => sum + (log.amount || 0), 0);
                cleanSave.gold += Math.floor(totalSpent * 100); // 1 token = 100 gold compensation

                // Update the save with clean structure
                await base44.asServiceRole.entities.PlayerSave.update(save.id, {
                    save_data: cleanSave,
                    updated_at: Date.now()
                });

                recovered++;
                console.log(`[recoverPlayerSaves] Recovered ${wallet.slice(0,6)}... (${spends.length} purchases)`);
            } catch (err) {
                errors.push({ wallet: wallet.slice(0,6), error: err.message });
            }
        }

        return Response.json({ 
            success: true,
            walletsRecovered: recovered,
            totalWalletsProcessed: spendByWallet.size,
            totalPurchasesProcessed: spendLogs.length,
            errors
        });
    } catch (error) {
        console.error('[recoverPlayerSaves]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});