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

// Relic fragment caps. Drop rates in PickupSystem produce ~1 fragment per 30-60s
// of normal play, NFT bonus may add up to +1 per drop. 1 fragment per 5 seconds
// is a generous upper bound that catches obvious tampering without rejecting
// long fragment-heavy runs. Endless runs get a smaller per-run cap.
const MAX_FRAGMENTS_PER_SEC = 0.2; // = 1 frag / 5s
const ENDLESS_FRAGMENTS_CAP_PER_RUN = 30;

// Endless mode anti-exploit caps. Long endless runs were granting up to 800k gold,
// breaking the upgrade economy. Caps now scale with playtime so a 30-min legit
// run isn't truncated like a 60s tampered one. Per-second budget × time + a small
// floor for very short runs. Hard ceiling prevents infinite-AFK exploits.
const ENDLESS_GOLD_PER_SEC = 12;        // ~720/min — fair for skilled play, well below tamper rates
const ENDLESS_KILLS_PER_SEC = 4;        // ~240/min sustained
const ENDLESS_GOLD_FLOOR = 1500;        // minimum cap for very short runs
const ENDLESS_KILLS_FLOOR = 600;
const ENDLESS_GOLD_HARD_CEILING = 18000;
const ENDLESS_KILLS_HARD_CEILING = 6000;

// Arena progression — must mirror game/Constants.js ARENAS order EXACTLY.
// Bug 2026-05-01 (Crybel): old order had stale ids ('voidring', 'singularity')
// and was missing 5 arenas, so beating Ethereal Nebula / Crimson Void didn't unlock the next sector.
const ARENA_ORDER = ['station', 'asteroid', 'nebula', 'void', 'plasma', 'crystal', 'moon', 'blackhole', 'mothership', 'dimension'];

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
    let kills = Number(scoreData.kills) || 0;
    const level = Number(scoreData.level) || 1;
    let gold = Number(scoreData.gold) || 0;
    let fragments = Math.max(0, Math.floor(Number(scoreData.fragments) || 0));

    if (time < MIN_TIME_SEC || time > MAX_TIME_SEC) {
        return { ok: false, reason: `time out of range: ${time}` };
    }
    if (kills < 0 || kills > Math.ceil(time * MAX_KILLS_PER_SEC)) {
        return { ok: false, reason: `kills out of range: ${kills} for ${time}s` };
    }
    if (level < 1 || level > MAX_LEVEL) {
        return { ok: false, reason: `level out of range: ${level}` };
    }
    // For endless: skip the per-kill gold sanity check — endless has its own
    // hard ceiling (ENDLESS_GOLD_HARD_CEILING) that already prevents tampering,
    // and boss drops can legitimately give large gold with few kills (early quit).
    // (Bug 2026-05-02: Texxy lost gold on early-quit endless runs — boss gold
    // exceeded kills*500 → entire run rejected → no save credited.)
    const isEndlessRun = scoreData.arena_id === 'endless';
    if (gold < 0) {
        return { ok: false, reason: `gold negative: ${gold}` };
    }
    if (!isEndlessRun && gold > Math.max(100, kills * MAX_GOLD_PER_KILL)) {
        return { ok: false, reason: `gold out of range: ${gold} for ${kills} kills` };
    }
    if (isEndlessRun && gold > ENDLESS_GOLD_HARD_CEILING * 2) {
        return { ok: false, reason: `endless gold absurd: ${gold}` };
    }

    // Endless economy nerf: cap gold + kills credited from endless runs.
    // Score uses uncapped values; ledger/aggregates use capped values.
    const isEndless = scoreData.arena_id === 'endless';
    let goldForLedger = gold;
    let killsForLedger = kills;
    let endlessGoldCapped = false;
    let endlessKillsCapped = false;
    if (isEndless) {
        const goldCap = Math.min(ENDLESS_GOLD_HARD_CEILING, Math.max(ENDLESS_GOLD_FLOOR, Math.floor(time * ENDLESS_GOLD_PER_SEC)));
        const killsCap = Math.min(ENDLESS_KILLS_HARD_CEILING, Math.max(ENDLESS_KILLS_FLOOR, Math.floor(time * ENDLESS_KILLS_PER_SEC)));
        if (gold > goldCap) {
            goldForLedger = goldCap;
            endlessGoldCapped = true;
        }
        if (kills > killsCap) {
            killsForLedger = killsCap;
            endlessKillsCapped = true;
        }
    }

    // Cap relic fragments per-run by playtime (generic anti-tamper) and a hard
    // ceiling for endless runs. Anything beyond is silently clamped (never reject
    // the run — players have legitimately lost too many of these already).
    const fragmentsTimeCap = Math.max(5, Math.ceil(time * MAX_FRAGMENTS_PER_SEC) + 2);
    let fragmentsForLedger = Math.min(fragments, fragmentsTimeCap);
    let fragmentsCapped = fragmentsForLedger < fragments;
    if (isEndless && fragmentsForLedger > ENDLESS_FRAGMENTS_CAP_PER_RUN) {
        fragmentsForLedger = ENDLESS_FRAGMENTS_CAP_PER_RUN;
        fragmentsCapped = true;
    }

    const arenaMult = getArenaMultiplier(scoreData.arena_id);
    const isVictory = !!scoreData.is_victory;
    // Score formula — reduced gold weight from ×5 to ×2 (balance pass 2026-05-02).
    // Whales with stacked gold multipliers (Synthbeats + mastery + talents + augments + VIP)
    // were earning 3-4× the gold of fresh players, which dominated leaderboard scores
    // and made the gap between top and mid-tier players unreachable. Skill-based
    // contributions (kills, time, level, victory) now matter more than character optimisation.
    const baseScore = kills * 10 + level * 100 + time * 5 + gold * 2 + (isVictory ? 5000 : 0);
    const score = Math.floor(baseScore * arenaMult);

    return {
        ok: true, score,
        kills, time, level, gold, fragments, // raw values (for score / leaderboard display)
        goldForLedger, killsForLedger, fragmentsForLedger, // capped values (for PlayerSave aggregation)
        endlessGoldCapped, endlessKillsCapped, fragmentsCapped, isEndless
    };
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
// Endless runs are EXCLUDED from gold + play bounty progress (anti-farm).
function updateBountyProgress(s, run, isEndless) {
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
            // Endless runs cannot progress "earn X gold (single run)" bounties — was being farmed
            if (isEndless) return;
            if (stats.gold > Number(b.progress || 0)) b.progress = stats.gold;
        } else if (b.type === 'level') {
            if (stats.level > Number(b.progress || 0)) b.progress = stats.level;
        } else if (b.type === 'play') {
            // Endless runs no longer count toward "Play X runs" bounty (was being cycled)
            if (isEndless) return;
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
function applyRunToSave(save, run, isVictory, charId, isEndless) {
    const s = { ...save };

    // Currencies — use capped values from validation (endless caps applied here)
    s.gold = Number(s.gold || 0) + run.gold;
    s.totalGoldEarned = Number(s.totalGoldEarned || 0) + run.gold;

    // Relic fragments — picked up in-run, server is the SOLE writer to PlayerSave.relicFragments.
    // (Client cannot bump this via syncSave; previous architecture lost legitimate pickups.)
    if (run.fragments > 0) {
        s.relicFragments = Number(s.relicFragments || 0) + run.fragments;
    }

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

    // Bounty / daily mission progress (Phase 3f). Endless excluded from gold/play bounties.
    updateBountyProgress(s, run, isEndless);

    s.updated_at = Date.now();
    return { saveData: s, unlockedArena, grantedCharacter };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Please sign in to save your score.' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { scoreData, squadStats } = await req.json();
        if (!scoreData) return Response.json({ error: 'Couldn\'t save your run — missing data. Please try again.' }, { status: 400 });

        // Validate stats and recompute score server-side
        const validation = validateAndRecompute(scoreData);
        if (!validation.ok) {
            console.warn(`[saveScore] REJECTED tampered run from ${walletAddress}: ${validation.reason}`);
            return Response.json({ error: 'Your run couldn\'t be validated and wasn\'t saved.' }, { status: 400 });
        }

        const isVictory = !!scoreData.is_victory;
        const charId = scoreData.character_id || 'neobyte';
        // Cap enemyKills total to the (possibly capped) ledger kills to keep aggregates consistent.
        const sanitisedEnemyKills = sanitiseEnemyKills(scoreData.enemyKills, validation.killsForLedger);

        // Apply run to PlayerSave (server-authoritative aggregation)
        const walletLower = walletAddress.toLowerCase();
        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower });
        if (records.length === 0) {
            return Response.json({ error: 'We couldn\'t find your save. Please refresh and try again.' }, { status: 400 });
        }
        const saveRecord = records[0];
        const saveData = typeof saveRecord.save_data === 'string'
            ? JSON.parse(saveRecord.save_data)
            : saveRecord.save_data;

        const { saveData: updatedSave, unlockedArena, grantedCharacter } = applyRunToSave(saveData, {
            kills: validation.killsForLedger,
            time: validation.time,
            level: validation.level,
            gold: validation.goldForLedger,
            fragments: validation.fragmentsForLedger,
            arena_id: scoreData.arena_id,
            encountered: Array.isArray(scoreData.encountered) ? scoreData.encountered : [],
            enemyKills: sanitisedEnemyKills,
        }, isVictory, charId, validation.isEndless);

        // Run finished cleanly — clear any cloud checkpoint snapshot so we don't
        // double-credit it on next launch via flushPendingScores.
        if (updatedSave.pendingRunSnapshot) {
            delete updatedSave.pendingRunSnapshot;
        }

        await base44.asServiceRole.entities.PlayerSave.update(saveRecord.id, {
            save_data: updatedSave,
            updated_at: Date.now()
        });

        // Build RunScore record
        const { week_id, season_id } = getCurrentPeriodIds();

        // Authoritative player_name comes from PlayerSave (set via Profile page).
        // Ignore the client-submitted name entirely — it can contain the OAuth
        // full_name as a fallback. Fall back to Pilot_XXXXXX if unset.
        const anonName = `Pilot_${walletAddress.slice(-6).toUpperCase()}`;
        const savedName = (saveData.player_name || saveRecord.player_name || '').trim();
        const safeName = savedName || anonName;

        const runScore = {
            user_id: me.id,
            wallet_address: walletAddress,
            player_name: safeName,
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

        // Update squad kills if applicable — use ledger-capped kills (endless capped, others raw)
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
            const killsToAdd = validation.killsForLedger;
            try {
                const squad = await base44.asServiceRole.entities.Squad.get(squadIdToUpdate);
                const dailyKillsReset = squad.current_day !== today ? 0 : (squad.daily_kills || 0);
                // Only update the fields we're changing — spreading the full entity
                // (with id/created_date/etc.) was causing the update to fail silently.
                await base44.asServiceRole.entities.Squad.update(squadIdToUpdate, {
                    weekly_kills: (squad.weekly_kills || 0) + killsToAdd,
                    daily_kills: dailyKillsReset + killsToAdd,
                    current_day: today
                });
                console.log(`[saveScore] Squad ${squadIdToUpdate} +${killsToAdd} kills (weekly=${(squad.weekly_kills || 0) + killsToAdd}, daily=${dailyKillsReset + killsToAdd})`);

                // ---- Squad Wars: also credit kills to the active war (if any) ----
                // Endless runs are EXCLUDED from squad war credit (anti-farm) — players
                // can grind endless indefinitely, which would otherwise let one squad
                // dominate wars without engaging with sector content.
                if (!validation.isEndless) {
                    try {
                        const activeWars = await base44.asServiceRole.entities.SquadWar.filter({ week_id, is_resolved: false });
                        const myWar = activeWars.find(w => w.squad_a_id === squadIdToUpdate || w.squad_b_id === squadIdToUpdate);
                        if (myWar) {
                            const isSideA = myWar.squad_a_id === squadIdToUpdate;
                            const patch = isSideA
                                ? { kills_a: (myWar.kills_a || 0) + killsToAdd }
                                : { kills_b: (myWar.kills_b || 0) + killsToAdd };
                            await base44.asServiceRole.entities.SquadWar.update(myWar.id, patch);
                            console.log(`[saveScore] War ${myWar.id} +${killsToAdd} kills to side ${isSideA ? 'A' : 'B'}`);
                        }
                    } catch (warErr) {
                        console.error('[saveScore] SquadWar update failed:', warErr.message);
                    }
                }
            } catch (err) {
                console.error('[saveScore] Squad update failed:', err.message);
            }
        }

        if (validation.endlessGoldCapped) console.log(`[saveScore] ${walletAddress} ENDLESS gold capped: raw=${validation.gold} → ledger=${validation.goldForLedger}`);
        if (validation.endlessKillsCapped) console.log(`[saveScore] ${walletAddress} ENDLESS kills capped: raw=${validation.kills} → ledger=${validation.killsForLedger}`);
        if (validation.fragmentsCapped) console.log(`[saveScore] ${walletAddress} fragments capped: raw=${validation.fragments} → ledger=${validation.fragmentsForLedger}`);
        console.log(`[saveScore] ${walletAddress} score=${validation.score} kills=${validation.kills} gold=${validation.goldForLedger} fragments=${validation.fragmentsForLedger} victory=${isVictory} endless=${validation.isEndless}${grantedCharacter ? ` granted=${grantedCharacter}` : ''}${unlockedArena ? ` unlockedArena=${unlockedArena}` : ''}`);
        return Response.json({
            success: true,
            score: validation.score,
            saveData: updatedSave,
            grantedCharacter,
            unlockedArena,
            // Tell client what was actually credited (may be < raw values for endless mode).
            goldCredited: validation.goldForLedger,
            killsCredited: validation.killsForLedger,
            fragmentsCredited: validation.fragmentsForLedger,
            endlessGoldCapped: !!validation.endlessGoldCapped,
            endlessKillsCapped: !!validation.endlessKillsCapped,
            fragmentsCapped: !!validation.fragmentsCapped,
        });
    } catch (error) {
        console.error('[saveScore]', error.message);
        return Response.json({ error: 'Something went wrong saving your score. Please try again.' }, { status: 500 });
    }
});