import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all spend logs
        const spendLogs = await base44.asServiceRole.entities.TokenSpendLog.filter({}, '-created_date', 10000);
        console.log(`[remediatePurchasedUpgrades] Processing ${spendLogs.length} spend logs`);

        const grantsNeeded = new Map(); // wallet -> [upgrades to grant]
        const statsGranted = new Map();
        const weaponsGranted = new Map();
        const talentsGranted = new Map();

        // Group by wallet to check later
        for (const log of spendLogs) {
            const wallet = log.wallet_address;
            if (!grantsNeeded.has(wallet)) {
                grantsNeeded.set(wallet, []);
            }
            grantsNeeded.get(wallet).push(log);
        }

        let totalGranted = 0;
        let processed = 0;

        // For each wallet with purchases, check their save
        for (const [wallet, logs] of grantsNeeded.entries()) {
            try {
                const saves = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });
                if (saves.length === 0) continue;

                let saveData = typeof saves[0].save_data === 'string' ? JSON.parse(saves[0].save_data) : saves[0].save_data;
                let modified = false;

                // Process each spend log for this wallet
                for (const log of logs) {
                    // Parse SKU to determine upgrade type
                    // Format: stat_perm_damage_1, weapon_perm_napbeam_damage_2, talent_perm_neobyte_dash_2, cosmetic_trail_default, etc.
                    const skuParts = log.amount.toString(); // Fallback: use amount as identifier
                    
                    // Try to infer from player_name patterns and context
                    // Most reliable: if spent on upgrades, grant basic stat upgrade if missing
                    const permStats = saveData.permanentUpgrades || {};
                    const weekStats = saveData.weeklyUpgrades || {};
                    const seasonStats = saveData.seasonalUpgrades || {};

                    // Grant 1 level of damage if COMPLETELY missing permanent upgrades (indicator of data loss)
                    if (Object.keys(permStats).length === 0 && Object.keys(weekStats).length === 0 && Object.keys(seasonStats).length === 0 && log.amount >= 15) {
                        // Multiple token spend suggests they bought several upgrades
                        if (!saveData.permanentUpgrades) saveData.permanentUpgrades = {};
                        saveData.permanentUpgrades.damage = Math.min(5, Math.floor(log.amount / 15)); // Rough estimate
                        modified = true;
                        totalGranted++;
                    }
                }

                if (modified) {
                    await base44.asServiceRole.entities.PlayerSave.update(saves[0].id, {
                        save_data: saveData,
                        updated_at: Date.now()
                    });
                    console.log(`[remediatePurchasedUpgrades] Granted upgrades to ${wallet.slice(0,6)}...`);
                }
                processed++;
            } catch (err) {
                console.error(`[remediatePurchasedUpgrades] Error processing ${wallet.slice(0,6)}...`, err.message);
            }
        }

        return Response.json({
            success: true,
            walletsProcessed: processed,
            upgradesGranted: totalGranted,
            logsAnalyzed: spendLogs.length,
            message: 'Scan complete. Manual review recommended for accurate restoration.'
        });
    } catch (error) {
        console.error('[remediatePurchasedUpgrades]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});