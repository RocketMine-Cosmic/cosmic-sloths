import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import moment from 'npm:moment@2.30.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const undistributedPools = await base44.asServiceRole.entities.TokenPool.filter({ distributed: false });
        
        const currentWeekId = moment().format('YYYY-[W]ww');
        const currentSeasonNum = Math.floor(moment().week() / 4) + 1;
        const currentSeasonId = `${moment().format('YYYY')}-S${currentSeasonNum}`;
        
        for (const pool of undistributedPools) {
            if (pool.period_type === 'weekly' && pool.period_id !== currentWeekId) {
                await distributeWeekly(base44, pool);
            } else if (pool.period_type === 'seasonal' && pool.period_id !== currentSeasonId) {
                await distributeSeasonal(base44, pool);
            }
        }
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function distributeWeekly(base44, pool) {
    const rewardPool = pool.total_spent * 0.30;
    const scores = await base44.asServiceRole.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 200);
    
    const uniqueScores = [];
    const seenPlayers = new Set();
    for (const score of scores) {
        if (!seenPlayers.has(score.player_name)) {
            seenPlayers.add(score.player_name);
            uniqueScores.push(score);
        }
        if (uniqueScores.length >= 20) break;
    }
    
    const getReward = (rank, p) => {
        if (rank === 1) return p * 0.20;
        if (rank === 2) return p * 0.15;
        if (rank === 3) return p * 0.10;
        if (rank >= 4 && rank <= 10) return p * 0.05;
        if (rank >= 11 && rank <= 20) return p * 0.02;
        return 0;
    };
    
    for (let i = 0; i < uniqueScores.length; i++) {
        const amount = Math.floor(getReward(i + 1, rewardPool));
        if (amount > 0) {
            await base44.asServiceRole.entities.PendingReward.create({
                player_name: uniqueScores[i].player_name,
                amount: amount,
                reason: `Weekly Leaderboard Rank ${i + 1}`,
                period_id: pool.period_id,
                claimed: false
            });
        }
    }
    
    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
}

async function distributeSeasonal(base44, pool) {
    const rewardPool = pool.total_spent * 0.40;
    const scores = await base44.asServiceRole.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 300);
    
    const uniqueScores = [];
    const seenPlayers = new Set();
    for (const score of scores) {
        if (!seenPlayers.has(score.player_name)) {
            seenPlayers.add(score.player_name);
            uniqueScores.push(score);
        }
        if (uniqueScores.length >= 30) break;
    }
    
    const getReward = (rank, p) => {
        if (rank === 1) return p * 0.15;
        if (rank === 2) return p * 0.10;
        if (rank === 3) return p * 0.08;
        if (rank >= 4 && rank <= 10) return p * 0.04;
        if (rank >= 11 && rank <= 20) return p * 0.024;
        if (rank >= 21 && rank <= 30) return p * 0.015;
        return 0;
    };
    
    for (let i = 0; i < uniqueScores.length; i++) {
        const amount = Math.floor(getReward(i + 1, rewardPool));
        if (amount > 0) {
            await base44.asServiceRole.entities.PendingReward.create({
                player_name: uniqueScores[i].player_name,
                amount: amount,
                reason: `Seasonal Leaderboard Rank ${i + 1}`,
                period_id: pool.period_id,
                claimed: false
            });
        }
    }
    
    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
}