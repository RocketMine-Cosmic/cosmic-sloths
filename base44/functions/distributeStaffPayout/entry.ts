import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Standalone weekly STAFF payout. Split out from manuallyDistributeRewards
// (2026-06-22) for the same reason as distributeKillPool: doing all three
// pools (players + staff + kills) in one HTTP call hit the gateway 504.
// Mirrors the staff block EXACTLY:
//   - Pulls all AdminWallet rows
//   - Pct = AdminWallet.payout_pct_override || AppConfig.staff_pct_per_wallet || 0.02
//   - Resume-safe via 'staff_weekly' PayoutLog
//   - Single grant-batch call (staff isn't ranked)

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { period_id, adminKey } = body;

        let callerWallet = 'EMERGENCY_KEY';
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('distribute_rewards') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'distribute_rewards' permission required" }, { status: 403 });
            }
        }

        if (!period_id) return Response.json({ error: 'Missing period_id' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_REWARDS_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'OMENX_REWARDS_API_KEY not configured' }, { status: 500 });

        const pools = await base44.asServiceRole.entities.TokenPool.filter({ period_id, period_type: 'weekly' });
        if (pools.length === 0) return Response.json({ error: 'No weekly pool found for this period' }, { status: 404 });
        const pool = pools[0];

        let STAFF_PCT_PER_WALLET = 0.02;
        try {
            const cfg = await base44.asServiceRole.entities.AppConfig.filter({ key: 'staff_pct_per_wallet' });
            const v = Number(cfg[0]?.value?.pct);
            if (isFinite(v) && v >= 0 && v <= 0.10) STAFF_PCT_PER_WALLET = v;
        } catch {}

        const adminWallets = await base44.asServiceRole.entities.AdminWallet.list();
        const resolveStaffPct = (a) => {
            const o = a.payout_pct_override;
            if (o !== null && o !== undefined && isFinite(Number(o)) && Number(o) >= 0 && Number(o) <= 0.10) {
                return Number(o);
            }
            return STAFF_PCT_PER_WALLET;
        };
        const staffPayments = adminWallets
            .filter(a => a.wallet_address)
            .map(a => ({
                walletAddress: a.wallet_address,
                amount: Math.floor(pool.total_spent * resolveStaffPct(a)),
                player_name: a.admin_name || a.wallet_address,
            }))
            .filter(p => p.amount >= 1);

        if (staffPayments.length === 0) {
            return Response.json({ success: true, paid: 0, skipped: 'no staff wallets' });
        }

        // Resume-safe
        const existingStaffLogs = await base44.asServiceRole.entities.PayoutLog.filter(
            { period_id, period_type: 'staff_weekly' }, '-created_date', 1000
        );
        const alreadyPaid = new Set(existingStaffLogs.map(l => (l.wallet_address || '').toLowerCase()));
        const remaining = staffPayments.filter(p => !alreadyPaid.has(p.walletAddress.toLowerCase()));

        if (remaining.length === 0) {
            return Response.json({ success: true, paid: 0, skipped_already_paid: alreadyPaid.size, skipped: 'all staff already paid' });
        }

        const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                payments: remaining.map(p => ({ walletAddress: p.walletAddress, amount: p.amount.toString() })),
                gameId: GAME_ID, gameName: GAME_NAME,
                note: `Cosmic Sloths weekly payout ${period_id} — Staff share`,
            }),
        });
        const batchResult = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`Staff batch failed — HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
        const txId = batchResult?.transactionId || batchResult?.txHash || '';

        for (const p of remaining) {
            await base44.asServiceRole.entities.PayoutLog.create({
                period_id, period_type: 'staff_weekly',
                wallet_address: p.walletAddress, player_name: p.player_name,
                amount: p.amount, rank: 0, tx_id: txId,
            });
        }

        try {
            await base44.asServiceRole.entities.AdminChangesLog.create({
                wallet_address: callerWallet,
                action_type: 'reward_adjustment',
                description: `Manual weekly STAFF payout for ${period_id}`,
                details: { period_id, paid: remaining.length, totalOmenx: remaining.reduce((s, p) => s + p.amount, 0) },
            });
        } catch {}

        return Response.json({
            success: true,
            period_id,
            paid: remaining.length,
            skipped_already_paid: alreadyPaid.size,
            totalOmenx: remaining.reduce((s, p) => s + p.amount, 0),
            tx_id: txId,
        });
    } catch (error) {
        console.error('[distributeStaffPayout]', error);
        return Response.json({ error: error?.message || String(error) }, { status: 500 });
    }
});