import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { adminKey, accessToken, confirm_refund } = body;

        // Auth: OAuth + refund_omenx permission, OR emergency admin key
        let callerWallet = 'EMERGENCY_KEY';
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });
            const sdk = new OmenXServerSDK({
                apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
                apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
            });
            const v = await sdk.verifyOAuthUser(accessToken);
            if (!v.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
            callerWallet = v.user?.walletAddress;
            if (!callerWallet) return Response.json({ error: 'No wallet on token' }, { status: 401 });
            const records = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('refund_omenx') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'refund_omenx' permission required" }, { status: 403 });
            }
        }

        if (!confirm_refund) {
            return Response.json({ error: 'Refund must be confirmed with confirm_refund: true' }, { status: 400 });
        }

        try {
            await base44.asServiceRole.entities.AdminChangesLog.create({
                wallet_address: callerWallet,
                action_type: 'other',
                description: 'Triggered full OMENX refund',
                details: {}
            });
        } catch {}

        console.log('[refundAllOmenx] Fetching all token spend logs...');
        const spendLogs = await base44.asServiceRole.entities.TokenSpendLog.list('', 10000);
        
        console.log('[refundAllOmenx] Total spend logs fetched:', spendLogs?.length || 0);
        if (spendLogs?.length > 0) {
            console.log('[refundAllOmenx] First log sample:', JSON.stringify(spendLogs[0], null, 2));
        }
        
        if (!spendLogs || spendLogs.length === 0) {
            return Response.json({ success: true, refunded: 0, totalAmount: 0, message: 'No spend logs found', debug: { totalLogs: 0 } });
        }

        // Group by wallet address and sum amounts
        const refundMap = {};
        let logsWithWallet = 0;
        let logsWithoutWallet = 0;
        
        spendLogs.forEach(log => {
            if (log.wallet_address) {
                logsWithWallet++;
                refundMap[log.wallet_address] = {
                    amount: (refundMap[log.wallet_address]?.amount || 0) + (log.amount || 0),
                    player_name: log.player_name
                };
            } else {
                logsWithoutWallet++;
            }
        });
        
        console.log('[refundAllOmenx] Logs with wallet_address:', logsWithWallet, 'Logs without:', logsWithoutWallet);

        console.log('[refundAllOmenx] Processing refunds for', Object.keys(refundMap).length, 'wallets');

        // Build batch refund payments
        const payments = Object.entries(refundMap).map(([walletAddress, data]) => ({
            walletAddress,
            amount: Math.floor(data.amount).toString(),
            player_name: data.player_name
        }));

        const apiKey = Deno.env.get('OMENX_REWARDS_API_KEY');
        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) {
            apiBaseUrl = `https://${apiBaseUrl}`;
        }

        // Issue batch refunds via OmenX API
        const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ 
                payments, 
                gameId: GAME_ID, 
                gameName: GAME_NAME, 
                note: 'full system refund' 
            }),
        });

        const batchResult = await response.json();
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
        }

        const totalRefunded = Object.values(refundMap).reduce((sum, data) => sum + data.amount, 0);
        console.log(`[refundAllOmenx] Refund complete: ${payments.length} wallets, ${totalRefunded} OMENX total`);

        return Response.json({
            success: true,
            refunded: payments.length,
            totalAmount: totalRefunded,
            txId: batchResult?.transactionId || batchResult?.txHash || '',
            failedWallets: [],
        });
    } catch (error) {
        console.error('[refundAllOmenx] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});