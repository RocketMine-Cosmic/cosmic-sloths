import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all TokenSpendLog entries (limit to recent 500 to avoid huge dataset)
        const spendLogs = await base44.asServiceRole.entities.TokenSpendLog.filter({}, '-created_date', 500);
        
        if (spendLogs.length === 0) {
            return Response.json({ success: true, message: 'No spend logs found', discrepancies: [] });
        }

        const discrepancies = [];
        const walletSpends = new Map();

        // Aggregate spending by wallet
        for (const log of spendLogs) {
            const wallet = log.wallet_address;
            if (!walletSpends.has(wallet)) {
                walletSpends.set(wallet, 0);
            }
            walletSpends.set(wallet, walletSpends.get(wallet) + (log.amount || 0));
        }

        // Check each wallet's PlayerSave against their total spending
        for (const [wallet, totalSpent] of walletSpends.entries()) {
            try {
                const playerSaves = await base44.asServiceRole.entities.PlayerSave.filter({ 
                    wallet_address: wallet 
                });

                if (playerSaves.length === 0) {
                    discrepancies.push({
                        wallet,
                        issue: 'NO_SAVE_FOUND',
                        totalSpent,
                        playerSaveBalance: null,
                        spendLogCount: spendLogs.filter(l => l.wallet_address === wallet).length
                    });
                    continue;
                }

                const save = playerSaves[0];
                const saveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
                
                // Note: We can't directly verify the amount spent from the save since it's encrypted/hashed
                // But we can check if the save exists and has basic structure
                if (!saveData || !saveData.pilotName) {
                    discrepancies.push({
                        wallet,
                        issue: 'CORRUPTED_SAVE',
                        totalSpent,
                        playerSaveId: save.id,
                        spendLogCount: spendLogs.filter(l => l.wallet_address === wallet).length
                    });
                }
            } catch (err) {
                discrepancies.push({
                    wallet,
                    issue: 'ERROR_CHECKING_SAVE',
                    error: err.message,
                    totalSpent,
                    spendLogCount: spendLogs.filter(l => l.wallet_address === wallet).length
                });
            }
        }

        return Response.json({ 
            success: true,
            totalWalletsAnalyzed: walletSpends.size,
            totalSpendLogsAnalyzed: spendLogs.length,
            discrepancies,
            discrepancyCount: discrepancies.length,
            healthStatus: discrepancies.length === 0 ? 'HEALTHY' : 'HAS_ISSUES'
        });
    } catch (error) {
        console.error('[auditPurchases]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});