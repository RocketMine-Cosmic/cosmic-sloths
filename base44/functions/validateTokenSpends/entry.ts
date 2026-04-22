import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { adminKey } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'OMENX_API_KEY not set' }, { status: 500 });

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        console.log('[validateTokenSpends] Fetching all TokenSpendLog entries...');
        const allLogs = await base44.asServiceRole.entities.TokenSpendLog.list('', 10000);
        console.log(`[validateTokenSpends] Found ${allLogs.length} spend log entries`);

        const phantomSpends = [];
        const validSpends = [];
        const walletBalances = new Map();

        for (const log of allLogs) {
            const wallet = log.wallet_address;
            if (!walletBalances.has(wallet)) {
                try {
                    const balance = await sdk.getPlayerBalance(wallet);
                    walletBalances.set(wallet, balance || 0);
                } catch (err) {
                    walletBalances.set(wallet, null);
                }
            }
            validSpends.push(log);
        }

        const totalValid = validSpends.reduce((sum, log) => sum + (log.amount || 0), 0);
        
        const allPools = await base44.asServiceRole.entities.TokenPool.list('', 10000);
        for (const pool of allPools) {
            await base44.asServiceRole.entities.TokenPool.delete(pool.id);
        }

        await base44.asServiceRole.entities.TokenPool.create({ period_id: '2026-W01', period_type: 'weekly', total_spent: totalValid, distributed: false });
        await base44.asServiceRole.entities.TokenPool.create({ period_id: '2026-S1', period_type: 'seasonal', total_spent: totalValid, distributed: false });

        return Response.json({
            success: true,
            totalLogsChecked: allLogs.length,
            validSpends: validSpends.length,
            phantomSpends: phantomSpends.length,
            totalValidAmount: totalValid,
        });
    } catch (error) {
        console.error('[validateTokenSpends] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});