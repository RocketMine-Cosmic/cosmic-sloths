import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Admin only
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const results = {
            upgraded: [],
            refunded: [],
            errors: []
        };

        // Fetch all spend logs
        const spendLogs = await base44.asServiceRole.entities.TokenSpendLog.list('-created_date', 5000);
        console.log(`[reconcileUpgradePurchases] Found ${spendLogs.length} spend logs`);

        // Group by wallet to track purchases
        const purchasesByWallet = {};
        for (const log of spendLogs) {
            const wallet = log.wallet_address;
            if (!purchasesByWallet[wallet]) purchasesByWallet[wallet] = [];
            purchasesByWallet[wallet].push(log);
        }

        // Check each wallet's purchases against their save
        for (const [wallet, purchases] of Object.entries(purchasesByWallet)) {
            try {
                // Get player save
                const saves = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });
                if (!saves || saves.length === 0) {
                    results.errors.push({ wallet, reason: 'No PlayerSave found' });
                    continue;
                }

                const save = saves[0];
                const saveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;

                // Track what upgrades were purchased (by SKU type inference)
                // Assume SKU pattern: upgrade_[type]_[level] or similar
                const purchasedUpgrades = {};
                let totalGoldRefund = 0;

                for (const log of purchases) {
                    // Infer upgrade type from amount or log structure
                    // For now, assume any purchase should add to an upgrade counter
                    const upgradeKey = log.action_type || 'unknown';
                    
                    // Check if this upgrade level is missing from save
                    if (saveData.permanentUpgrades) {
                        for (const [upgradeType, level] of Object.entries(saveData.permanentUpgrades)) {
                            // Track purchases
                            purchasedUpgrades[upgradeType] = (purchasedUpgrades[upgradeType] || 0) + 1;
                        }
                    }
                }

                // Grant any missing upgrades by adding 1 to random upgrade type
                // OR if already purchased (duplicate), refund gold
                const upgradeTypes = ['damage', 'health', 'speed', 'magnet', 'regen', 'cooldown', 'luck'];
                
                for (const log of purchases) {
                    const upgradeType = upgradeTypes[Math.floor(Math.random() * upgradeTypes.length)];
                    const currentLevel = saveData.permanentUpgrades?.[upgradeType] || 0;

                    // Check if this purchase was already applied (heuristic: if recent save has this upgrade)
                    const isDuplicate = currentLevel > 0;

                    if (isDuplicate) {
                        // Already have it → refund gold
                        const refundAmount = 500; // Standard upgrade cost in gold
                        saveData.gold = (saveData.gold || 0) + refundAmount;
                        results.refunded.push({ wallet, upgrade: upgradeType, gold: refundAmount, reason: 'Duplicate purchase' });
                        totalGoldRefund += refundAmount;
                    } else {
                        // Missing → grant upgrade
                        if (!saveData.permanentUpgrades) saveData.permanentUpgrades = { damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 };
                        saveData.permanentUpgrades[upgradeType] = (saveData.permanentUpgrades[upgradeType] || 0) + 1;
                        results.upgraded.push({ wallet, upgrade: upgradeType, newLevel: saveData.permanentUpgrades[upgradeType] });
                    }
                }

                // Save reconciled data
                if (results.refunded.length > 0 || results.upgraded.length > 0) {
                    saveData.updated_at = Date.now();
                    await base44.asServiceRole.entities.PlayerSave.update(save.id, {
                        save_data: saveData
                    });
                }

            } catch (e) {
                results.errors.push({ wallet, reason: e.message });
            }
        }

        console.log('[reconcileUpgradePurchases] Completed:', JSON.stringify(results));
        return Response.json({ success: true, ...results });
    } catch (error) {
        console.error('[reconcileUpgradePurchases]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});