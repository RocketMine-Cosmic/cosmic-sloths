import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// Server-authoritative: validates run stats with sanity caps, recomputes score,
// AND is the sole writer for run-aggregate fields on PlayerSave (Phase 3c).

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

// Arena progression — must mirror game/Constants.js ARENAS order.
const ARENA_ORDER = ['station', 'asteroid', 'nebula', 'voidring', 'singularity'];

// Character unlock kill milestones — must mirror game/CharacterUnlocks.js.
const KILL_MILESTONES = [0, 2000, 5000, 10000, 20000];
// Full character roster — must mirror game/Constants.js CHARACTERS ids.
const ALL_CHARACTER_IDS = [
    'neobyte', 'pandypaws', 'novabyte', 'glitch', 'holodrift',
    'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte'
];

function getArenaMultiplier(arenaId) {
    if (arenaId === 'endless') return 2.0;
    const idx = ARENA_ORDER.indexOf(arenaId);
    return 1.0 + (Math.max(0, idx) * 0.2);
}

function validateAndRecompute(scoreData) {
    const time = Number(scoreData.time_survived) || 0;
    const kills = Number(scoreData.kills) || 0;
    const level = Number(scoreData.level) || 1;
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

    const arenaMult = getArenaMultiplier(scoreData.arena_id);
    const isVictory = !!scoreData.is_victory;
    const baseScore = kills * 10 + level * 100 + time * 5 + gold * 5 + (isVictory ? 5000 : 0);
    const score = Math.floor(baseScore * arenaMult);

    return { ok: true, score, kills, time, level, gold };
}

// Sanitise per-enemy kill counts: cap to validated total kills.
function sanitiseEnemyKills(rawEnemyKills, capTotal) {
    if (!rawEnemyKills || typeof rawEnemyKills !== 'object') return {};
    const out = {};
    let runningSum = 0;
    for (const [id, count] of Object.entries(rawEnemyKills)) {
        const n = Math.max(0, Math.floor(Number(count) || 0));
        if (n === 0) continue;
        const allowed = Math.max(0, capTotal - runningSum);
        const capped = Math.min(n, allowed);
        if (capped > 0) {
            out[id] = capped;
            runningSum += capped;
        }
    }
    return out;
}

// Update bounty + daily mission progress in-place. Server is source of truth (Phase 3f).
function updateBountyProgress(s, run) {
    const stats = {
        kills: run.kills,
        time: run.time,
        level: run.level,
        gold: run.gold,
    };

    const apply = (b) => {
        if (!b || b.claimed) return;
        if (b.type === 'kills') {
            b.progress = Number(b.progress || 0) + stats.kills;
        } else if (b.type === 'survive') {
            if (stats.time > Number(b.progress || 0)) b.progress = stats.time;
        } else if (b.type === 'gold') {
            if (stats.gold > Number(b.progress || 0)) b.progress = stats.gold;
        } else if (b.type === 'level') {
            if (stats.level > Number(b.progress || 0)) b.progress = stats.level;
        } else if (b.type === 'play') {
            b.progress = Number(b.progress || 0) + 1;
        }
    };

    if (s.bounties) {
        if (Array.isArray(s.bounties.active)) {
            s.bounties.active = s.bounties.active.map(b => { const c = { ...b }; apply(c); return c; });
        }
        if (s.bounties.dailyMission) {
            const c = { ...s.bounties.dailyMission };
            apply(c);
            s.bounties.dailyMission = c;
        }
    }
}

// Apply run results to PlayerSave server-side. Returns updated save_data.
function applyRunToSave(save, run, isVictory, charId) {
    const s = { ...save };

    // Currencies
    s.gold = Number(s.gold || 0) + run.gold;
    s.totalGoldEarned = Number(s.totalGoldEarned || 0) + run.gold;

    // Kills
    const prevTotalKills = Number(s.totalKills || 0);
    const newTotalKills = prevTotalKills + run.kills;
    s.totalKills = newTotalKills;

    s.characterKills = { ...(s.characterKills || {}) };
    s.characterKills[charId] = Number(s.characterKills[charId] || 0) + run.kills;

    if (run.enemyKills) {
        s.enemyKills = { ...(s.enemyKills || {}) };
        for (const [id, n] of Object.entries(run.enemyKills)) {
            s.enemyKills[id] = Number(s.enemyKills[id] || 0) + n;
        }
    }

    // High-water marks
    s.maxTimeSurvived = Math.max(Number(s.maxTimeSurvived || 0), run.time);
    s.maxLevelReached = Math.max(Number(s.maxLevelReached || 0), run.level);

    // Discovery
    if (Array.isArray(run.encountered) && run.encountered.length > 0) {
        s.encounteredEnemies = [...new Set([...(s.encounteredEnemies || []), ...run.encountered])];
    }

    // Arena progression on victory (skip endless / world boss runs)
    let unlockedArena = null;
    if (isVictory && run.arena_id && run.arena_id !== 'endless') {
        const idx = ARENA_ORDER.indexOf(run.arena_id);
        if (idx >= 0 && idx < ARENA_ORDER.length - 1) {
            const nextArena = ARENA_ORDER[idx + 1];
            const map = { ...(s.unlockedArenasByCharacter || {}) };
            const charArenas = Array.isArray(map[charId]) ? [...map[charId]] : ['station'];
            if (!charArenas.includes(nextArena)) {
                charArenas.push(nextArena);
                unlockedArena = nextArena;
            }
            map[charId] = charArenas;
            s.unlockedArenasByCharacter = map;
        } else if (idx === ARENA_ORDER.length - 1) {
            s.newGamePlusUnlocked = true;
        }
    }

    // Character milestone unlocks (random)
    let grantedCharacter = null;
    const prevCrossed = KILL_MILESTONES.filter(m => prevTotalKills >= m);
    const newCrossed = KILL_MILESTONES.filter(m => newTotalKills >= m);
    const newlyCrossed = newCrossed.filter(m => !prevCrossed.includes(m));
    if (newlyCrossed.length > 0) {
        const unlocked = Array.isArray(s.unlockedCharacters) ? [...s.unlockedCharacters] : ['neobyte'];
        for (const _milestone of newlyCrossed) {
            const available = ALL_CHARACTER_IDS.filter(id => !unlocked.includes(id));
            if (available.length === 0) break;
            const pick = available[Math.floor(Math.random() * available.length)];
            unlocked.push(pick);
            grantedCharacter = pick;
        }
        s.unlockedCharacters = unlocked;
    }

    // Bounty / daily mission progress (Phase 3f)
    updateBountyProgress(s, run);

    s.updated_at = Date.now();
    return { saveData: s, unlockedArena, grantedCharacter };
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

        const isVictory = !!scoreData.is_victory;
        const charId = scoreData.character_id || 'neobyte';
        const sanitisedEnemyKills = sanitiseEnemyKills(scoreData.enemyKills, validation.kills);

        // Apply run to PlayerSave (server-authoritative aggregation)
        const walletLower = walletAddress.toLowerCase();
        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });
        if (records.length === 0) {
            return Response.json({ error: 'PlayerSave not found — sync your save first' }, { status: 400 });
        }
        const saveRecord = records[0];
        const saveData = typeof saveRecord.save_data === 'string'
            ? JSON.parse(saveRecord.save_data)
            : saveRecord.save_data;

        const { saveData: updatedSave, unlockedArena, grantedCharacter } = applyRunToSave(saveData, {
            kills: validation.kills,
            time: validation.time,
            level: validation.level,
            gold: validation.gold,
            arena_id: scoreData.arena_id,
            encountered: Array.isArray(scoreData.encountered) ? scoreData.encountered : [],
            enemyKills: sanitisedEnemyKills,
        }, isVictory, charId);

        await base44.asServiceRole.entities.PlayerSave.update(saveRecord.id, {
            save_data: updatedSave,
            updated_at: Date.now()
        });

        // Build RunScore record
        const { week_id, season_id } = getCurrentPeriodIds();
        const runScore = {
            user_id: me.id,
            wallet_address: walletAddress,
            player_name: scoreData.player_name,
            player_title: scoreData.player_title || '',
            pilot_icon: scoreData.pilot_icon || '',
            score: validation.score,
            time_survived: validation.time,
            level: validation.level,
            kills: validation.kills,
            character_id: charId,
            arena_id: scoreData.arena_id,
            week_id,
            season_id,
        };

        try {
            await base44.asServiceRole.entities.RunScore.create(runScore);
        } catch (err) {
            console.error('[saveScore] RunScore save failed:', err.message);
            // Save was already applied; return success with warning
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
            } catch (err) {
                console.error('[saveScore] Squad update failed:', err.message);
            }
        }

        console.log(`[saveScore] ${walletAddress} score=${validation.score} kills=${validation.kills} victory=${isVictory}${grantedCharacter ? ` granted=${grantedCharacter}` : ''}${unlockedArena ? ` unlockedArena=${unlockedArena}` : ''}`);
        return Response.json({
            success: true,
            score: validation.score,
            saveData: updatedSave,
            grantedCharacter,
            unlockedArena,
        });
    } catch (error) {
        console.error('[saveScore]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});