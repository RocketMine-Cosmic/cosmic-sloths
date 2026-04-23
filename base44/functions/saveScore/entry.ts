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

function isLeaderboardLocked() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    if (utcDay === 0 && utcHour >= 23) return true;
    if (utcDay === 1 && utcHour < 23) return true;
    return false;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { scoreData, walletAddress: clientWallet, squadStats, accessToken } = await req.json();

        if (isLeaderboardLocked()) {
            return Response.json({ error: 'Leaderboard is locked for distribution' }, { status: 423 });
        }

        if (!scoreData || !clientWallet) {
            return Response.json({ error: 'scoreData and walletAddress required' }, { status: 400 });
        }

        const { week_id, season_id } = getCurrentPeriodIds();
        scoreData.week_id = week_id;
        scoreData.season_id = season_id;

        const walletAddress = clientWallet;
        scoreData.wallet_address = walletAddress;

        const existingScores = await base44.asServiceRole.entities.RunScore.filter({
            wallet_address: walletAddress,
            week_id: scoreData.week_id
        });

        let result;
        if (existingScores.length > 0) {
            const best = existingScores.reduce((a, b) => (a.score > b.score ? a : b));
            for (const e of existingScores) {
                if (e.id !== best.id) await base44.asServiceRole.entities.RunScore.delete(e.id);
            }
            if (scoreData.score > best.score) {
                result = await base44.asServiceRole.entities.RunScore.update(best.id, scoreData);
            } else {
                result = await base44.asServiceRole.entities.RunScore.update(best.id, { player_name: scoreData.player_name });
            }
        } else {
            result = await base44.asServiceRole.entities.RunScore.create(scoreData);
        }

        if (squadStats && squadStats.squadId && typeof squadStats.squadId === 'string' && squadStats.squadId.length > 0) {
            try {
                const [members, squad] = await Promise.all([
                    base44.asServiceRole.entities.SquadMember.filter({ squad_id: squadStats.squadId, wallet_address: walletAddress }),
                    base44.asServiceRole.entities.Squad.get(squadStats.squadId)
                ]);
                if (members.length > 0 && squad) {
                    const today = new Date().toISOString().split('T')[0];
                    const currentDay = squad.current_day || today;
                    let newDailyKills = (squad.daily_kills || 0) + (squadStats.kills || 0);
                    if (currentDay !== today) newDailyKills = squadStats.kills || 0;
                    await base44.asServiceRole.entities.Squad.update(squad.id, {
                        weekly_kills: (squad.weekly_kills || 0) + (squadStats.kills || 0),
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