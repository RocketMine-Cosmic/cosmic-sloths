import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { adminKey } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) {
            return Response.json({ error: 'Admin only' }, { status: 403 });
        }

        const week_id = '2026-W16';
        const testAmount = 531;

        const existing = await base44.asServiceRole.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' });
        if (existing.length > 0) {
            await base44.asServiceRole.entities.TokenPool.delete(existing[0].id);
        }

        const pool = await base44.asServiceRole.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: testAmount, distributed: false });

        const spends = [
            { user_id: 'test-player-1', player_name: 'Test Player 1', wallet_address: '0xtest1', amount: 200 },
            { user_id: 'test-player-2', player_name: 'Test Player 2', wallet_address: '0xtest2', amount: 200 },
            { user_id: 'test-player-3', player_name: 'Test Player 3', wallet_address: '0xtest3', amount: 131 },
        ];

        for (const spend of spends) {
            await base44.asServiceRole.entities.TokenSpendLog.create({ ...spend, week_id, season_id: '2026-S2' });
        }

        console.log(`[seedTestTokenPool] Seeded 2026-W16 with 531 OMEN pool and 3 test spend logs`);
        return Response.json({ success: true, pool: pool.id, total_spent: testAmount, test_spends: 3 });
    } catch (error) {
        console.error('[seedTestTokenPool] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});