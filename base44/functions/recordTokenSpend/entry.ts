import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    let user;
    try {
        const base44 = createClientFromRequest(req);
        user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { amount, week_id, season_id } = await req.json();

        if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount) || amount > 1000) {
            console.warn(`Suspicious token spend attempt by ${user.full_name || user.email}: amount=${amount}`);
            return Response.json({ error: 'Invalid amount' }, { status: 400 });
        }

        console.log(`User ${user.full_name || user.email} is logging a spend of ${amount} tokens.`);

        // Log the individual spend
        await base44.asServiceRole.entities.TokenSpendLog.create({
            user_id: user.id,
            player_name: user.full_name || user.player_name || user.email || 'Unknown',
            amount: amount,
            week_id: week_id || null,
            season_id: season_id || null
        });

        // Update Weekly Pool
        const weeklyPools = await base44.asServiceRole.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' });
        if (weeklyPools.length > 0) {
            await base44.asServiceRole.entities.TokenPool.update(weeklyPools[0].id, { total_spent: weeklyPools[0].total_spent + amount });
        } else {
            await base44.asServiceRole.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: amount, distributed: false });
        }

        // Update Seasonal Pool
        const seasonalPools = await base44.asServiceRole.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
        if (seasonalPools.length > 0) {
            await base44.asServiceRole.entities.TokenPool.update(seasonalPools[0].id, { total_spent: seasonalPools[0].total_spent + amount });
        } else {
            await base44.asServiceRole.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent: amount, distributed: false });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error(`Error recording token spend for user ${user?.full_name || user?.player_name || user?.email || 'Unknown'}:`, error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});