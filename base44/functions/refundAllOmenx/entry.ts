import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { adminKey, confirm_refund } = body;

        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        if (!confirm_refund) {
            return Response.json({ error: 'Refund must be confirmed with confirm_refund: true' }, { status: 400 });
        }

        console.log('[refundAllOmenx] Fetching all token spend logs...');
        const spendLogs = await base44.asServiceRole.entities.TokenSpendLog.list('', 10000);
        
        if (!spendLogs || spendLogs.length === 0) {
            return Response.json({ success: true, refunded: 0, totalAmount: 0, message: 'No spend logs found' });
        }

        // Group by wallet address and sum amounts
        const refundMap = {};
        spendLogs.forEach(log => {
            if (log.wallet_address) {
                refundMap[log.wallet_address] = (refundMap[log.wallet_address] || 0) + (log.amount || 0);
            }
        });

        console.log('[refundAllOmenx] Processing refunds for', Object.keys(refundMap).length, 'wallets');

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_PAYMENT_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });

        let successCount = 0;
        let totalRefunded = 0;
        const failedWallets = [];

        // Issue refunds
        for (const [walletAddress, amount] of Object.entries(refundMap)) {
            try {
                console.log(`[refundAllOmenx] Refunding ${amount} OMENX to ${walletAddress}`);
                const refundResult = await sdk.issueRefund({
                    walletAddress,
                    amount,
                    reason: 'Game-wide refund for service incident',
                });
                
                if (refundResult.success) {
                    successCount++;
                    totalRefunded += amount;
                } else {
                    failedWallets.push({ walletAddress, amount, reason: refundResult.error });
                }
            } catch (e) {
                console.error(`[refundAllOmenx] Refund failed for ${walletAddress}:`, e.message);
                failedWallets.push({ walletAddress, amount, reason: e.message });
            }
        }

        console.log(`[refundAllOmenx] Refund complete: ${successCount} wallets, ${totalRefunded} OMENX total`);

        return Response.json({
            success: true,
            refunded: successCount,
            totalAmount: totalRefunded,
            failedCount: failedWallets.length,
            failedWallets: failedWallets.length > 0 ? failedWallets : null,
        });
    } catch (error) {
        console.error('[refundAllOmenx] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});