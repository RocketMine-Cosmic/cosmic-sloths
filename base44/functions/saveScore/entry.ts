import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Canonical period ID calculation — must match purchaseSku and lib/periodIds.js exactly
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

// Check if leaderboard is locked (Sunday 23:00 UTC to Monday 23:00 UTC for distribution)
function isLeaderboardLocked() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    // Lock on Sunday 23:00 UTC (day 0, hour 23) through Monday 23:00 UTC (day 1, hour 23)
    if (utcDay === 0 && utcHour >= 23) return true; // Sunday 23:00+ UTC
    if (utcDay === 1 && utcHour < 23) return true;   // Monday 00:00-22:59 UTC
    return false;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { scoreData, walletAddress: clientWallet, squadStats, accessToken } = await req.json();
        
        // Check if leaderboard is locked during distribution window
        if (isLeaderboardLocked()) {
            return Response.json({ error: 'Leaderboard is locked for distribution' }, { status: 423 });
        }
        
        // Override week_id and season_id with canonical server-side calculation
        const { week_id, season_id } = getCurrentPeriodIds();
        scoreData.week_id = week_id;
        scoreData.season_id = season_id;

        if (!scoreData || !clientWallet) {
            return Response.json({ error: 'scoreData and walletAddress required' }, { status: 400 });
        }

        // Verify identity via OmenX — require accessToken
        if (!accessToken) {
            return Response.json({ error: 'accessToken required for verification' }, { status: 401 });
        }
        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) {
            return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        }
        const walletAddress = verifyResult.user.walletAddress;

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

        // Update squad kills if provided — verify user is squad member and squadId is valid
        if (squadStats && squadStats.squadId && typeof squadStats.squadId === 'string' && squadStats.squadId.length > 0) {
            try {
                const [members, squad] = await Promise.all([
                    base44.asServiceRole.entities.SquadMember.filter({ squad_id: squadStats.squadId, wallet_address: walletAddress }),
                    base44.asServiceRole.entities.Squad.get(squadStats.squadId)
                ]);
                if (members.length === 0) {
                    console.error('[saveScore] Player not in squad, rejecting update');
                    return Response.json({ error: 'Not a member of this squad' }, { status: 403 });
                }
                if (squad) {
                    const today = new Date().toISOString().split('T')[0];
                    const currentDay = squad.current_day || today;
                    let newDailyKills = (squad.daily_kills || 0) + (squadStats.kills || 0);
                    // Reset daily kills if day changed
                    if (currentDay !== today) {
                        newDailyKills = squadStats.kills || 0;
                    }
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