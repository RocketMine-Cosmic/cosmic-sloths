import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// Server-authoritative: validates run stats with sanity caps and recomputes score.

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

// Sanity caps (loose) — runs exceeding these are rejected as tampered
const MAX_KILLS_PER_SEC = 200;
const MAX_GOLD_PER_KILL = 500;
const MAX_LEVEL = 500;
const MAX_TIME_SEC = 60 * 60; // 60 minutes
const MIN_TIME_SEC = 1;       // No instant runs

// Arena multipliers must mirror pages/Game.jsx for score recomputation.
// Index = arena order (0-based). 'endless' uses fixed 2.0x.
function getArenaMultiplier(arenaId) {
    if (arenaId === 'endless') return 2.0;
    const ARENA_ORDER = ['station', 'asteroid', 'nebula', 'voidring', 'singularity'];
    const idx = ARENA_ORDER.indexOf(arenaId);
    return 1.0 + (Math.max(0, idx) * 0.2);
}

function validateAndRecompute(scoreData) {
    const time = Number(scoreData.time_survived) || 0;
    const kills = Number(scoreData.kills) || 0;
    const level = Number(scoreData.level) || 1;
    // Note: gold is on the run stats sent client-side via `gold` (not on RunScore schema)
    const gold = Number(scoreData.gold) || 0;

    if (time < MIN_TIME_SEC || time > MAX_TIME_SEC) {
        return { ok: false, reason: `time out of range: ${time}` };
    }
    if (kills < 0 || kills > Math.ceil(time * MAX_KILLS_PER_SEC)) {
        return { ok: false, reason: `kills out of range: ${kills} for ${time}s` };
    }
    if (level < 1 || level > MAX_LEVEL) {
        return { ok: false, reason: `level out of range: ${level}` };
    }
    if (gold < 0 || gold > Math.max(100, kills * MAX_GOLD_PER_KILL)) {
        return { ok: false, reason: `gold out of range: ${gold} for ${kills} kills` };
    }

    // Recompute score from validated stats — same formula as Game.jsx
    const arenaMult = getArenaMultiplier(scoreData.arena_id);
    const isVictory = !!scoreData.is_victory;
    const baseScore = kills * 10 + level * 100 + time * 5 + gold * 5 + (isVictory ? 5000 : 0);
    const score = Math.floor(baseScore * arenaMult);

    return { ok: true, score, kills };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { scoreData, squadStats } = await req.json();
        if (!scoreData) return Response.json({ error: 'scoreData required' }, { status: 400 });

        // Validate stats and recompute score server-side
        const validation = validateAndRecompute(scoreData);
        if (!validation.ok) {
            console.warn(`[saveScore] REJECTED tampered run from ${walletAddress}: ${validation.reason}`);
            return Response.json({ error: 'Run failed validation', detail: validation.reason }, { status: 400 });
        }

        const { week_id, season_id } = getCurrentPeriodIds();
        scoreData.week_id = week_id;
        scoreData.season_id = season_id;
        scoreData.wallet_address = walletAddress;
        scoreData.user_id = me.id;
        scoreData.score = validation.score;       // server-computed score
        scoreData.kills = validation.kills;       // capped kills
        // Strip client-only fields not on RunScore schema
        delete scoreData.gold;
        delete scoreData.is_victory;

        // Save RunScore
        try {
            await base44.asServiceRole.entities.RunScore.create(scoreData);
        } catch (err) {
            console.error('[saveScore] RunScore save failed:', err.message);
            return Response.json({ error: 'Failed to save score' }, { status: 500 });
        }

        // Update squad kills if applicable — use validated/capped kills
        let squadIdToUpdate = squadStats?.squadId || null;
        if (!squadIdToUpdate) {
            try {
                const memberRecords = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress });
                if (memberRecords && memberRecords.length > 0) {
                    squadIdToUpdate = memberRecords[0].squad_id;
                }
            } catch (err) {
                console.log('[saveScore] Could not fetch squad membership:', err.message);
            }
        }

        if (squadIdToUpdate) {
            const today = new Date().toISOString().split('T')[0];
            // Use server-validated kills, NOT client-provided squadStats.kills
            const killsToAdd = validation.kills;
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

        console.log('[saveScore] Saved for wallet:', walletAddress, 'score:', validation.score);
        return Response.json({ success: true, score: validation.score });
    } catch (error) {
        console.error('[saveScore]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});