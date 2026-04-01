import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { newIcon } = await req.json();
        
        if (!newIcon) {
             return Response.json({ error: 'newIcon required' }, { status: 400 });
        }

        // Update RunScore (match by user_id AND created_by to catch older records)
        const runScoresById = await base44.asServiceRole.entities.RunScore.filter({ user_id: user.id });
        const runScoresByEmail = await base44.asServiceRole.entities.RunScore.filter({ created_by: user.email });
        
        const allRunScores = new Map();
        [...runScoresById, ...runScoresByEmail].forEach(s => allRunScores.set(s.id, s));
        
        for (const score of allRunScores.values()) {
            if (score.pilot_icon !== newIcon) {
                await base44.asServiceRole.entities.RunScore.update(score.id, { 
                    pilot_icon: newIcon,
                    user_id: score.user_id || user.id, // Ensure required fields are not dropped from old records
                    score: score.score || 0,
                    week_id: score.week_id || 'unknown',
                    season_id: score.season_id || 'unknown',
                    player_name: score.player_name || user.full_name
                });
            }
        }
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});