import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { scoreData, walletAddress } = await req.json();

        if (!scoreData || !walletAddress) {
            return Response.json({ error: 'scoreData and walletAddress required' }, { status: 400 });
        }

        // Add wallet address to the score data
        scoreData.wallet_address = walletAddress;

        // Check if player already has a score in this period
        const existingScores = await base44.asServiceRole.entities.RunScore.filter({
            user_id: scoreData.user_id,
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

        return Response.json({ success: true, scoreId: result.id });
    } catch (error) {
        console.error('[saveScore] error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});