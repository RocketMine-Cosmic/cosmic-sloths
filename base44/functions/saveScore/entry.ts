import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { scoreData, walletAddress, squadStats } = await req.json();

        if (!scoreData || !walletAddress) {
            return Response.json({ error: 'scoreData and walletAddress required' }, { status: 400 });
        }

        // Add wallet address to the score data
        scoreData.wallet_address = walletAddress;

        // Check if player already has a score in this period
        const existingScores = await base44.asServiceRole.entities.RunScore.filter({
            wallet_address: walletAddress,
            week_id: scoreData.week_id
        });

        let result;
        if (existingScores.length > 0) {
            // Deduplicate by keeping best score
            const best = existingScores.reduce((a, b) => (a.score > b.score ? a : b));
            // Delete duplicates
            for (const e of existingScores) {
                if (e.id !== best.id) {
                    await base44.asServiceRole.entities.RunScore.delete(e.id);
                }
            }
            // Update if new score is better, or always update player_name
            if (scoreData.score > best.score) {
                result = await base44.asServiceRole.entities.RunScore.update(best.id, scoreData);
            } else {
                result = await base44.asServiceRole.entities.RunScore.update(best.id, { player_name: scoreData.player_name });
            }
        } else {
            result = await base44.asServiceRole.entities.RunScore.create(scoreData);
        }

        // Update squad kills if provided
        if (squadStats && squadStats.squadId) {
            try {
                const squad = await base44.asServiceRole.entities.Squad.get(squadStats.squadId);
                if (squad) {
                    const today = new Date().toISOString().split('T')[0];
                    let newDailyKills = (squad.daily_kills || 0) + squadStats.kills;
                    if (squad.current_day !== today) {
                        newDailyKills = squadStats.kills;
                    }
                    await base44.asServiceRole.entities.Squad.update(squad.id, {
                        weekly_kills: (squad.weekly_kills || 0) + squadStats.kills,
                        daily_kills: newDailyKills,
                        current_day: today
                    });
                }
            } catch (err) {
                console.error('[saveScore] Failed to update squad kills:', err);
            }
        }

        return Response.json({ success: true, scoreId: result.id });
    } catch (error) {
        console.error('[saveScore] error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});