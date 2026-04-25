import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getCurrentPeriodIds() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${year}-S${seasonNum}`;
    return { week_id, season_id };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ error: 'OmenX wallet not linked' }, { status: 400 });
        }

        const { scoreData, squadStats } = await req.json();
        if (!scoreData) {
            return Response.json({ error: 'scoreData required' }, { status: 400 });
        }

        const { week_id, season_id } = getCurrentPeriodIds();
        scoreData.week_id = week_id;
        scoreData.season_id = season_id;
        scoreData.wallet_address = wallet;

        // Save RunScore
        try {
            await base44.asServiceRole.entities.RunScore.create(scoreData);
        } catch (err) {
            console.error('[saveScore] RunScore save failed:', err.message);
            return Response.json({ error: 'Failed to save score' }, { status: 500 });
        }

        // Update squad kills if applicable
        let squadIdToUpdate = squadStats?.squadId || null;
        if (!squadIdToUpdate) {
            try {
                const memberRecords = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: wallet });
                if (memberRecords && memberRecords.length > 0) {
                    squadIdToUpdate = memberRecords[0].squad_id;
                }
            } catch (err) {
                console.log('[saveScore] Could not fetch squad membership:', err.message);
            }
        }

        if (squadIdToUpdate) {
            const today = new Date().toISOString().split('T')[0];
            const killsToAdd = squadStats?.kills || scoreData.kills || 0;
            try {
                const squad = await base44.asServiceRole.entities.Squad.read(squadIdToUpdate);
                const dailyKillsReset = squad.current_day !== today ? 0 : (squad.daily_kills || 0);
                const updatedSquad = {
                    ...squad,
                    weekly_kills: (squad.weekly_kills || 0) + killsToAdd,
                    daily_kills: dailyKillsReset + killsToAdd,
                    current_day: today
                };
                await base44.asServiceRole.entities.Squad.update(squadIdToUpdate, updatedSquad);
                console.log(`[saveScore] Updated squad ${squadIdToUpdate} +${killsToAdd} kills`);
            } catch (err) {
                console.error('[saveScore] Squad update failed:', err.message);
            }
        }

        console.log('[saveScore] Saved for wallet:', wallet);
        return Response.json({ success: true });
    } catch (error) {
        console.error('[saveScore]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});