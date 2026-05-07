import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// Server-authoritative: validates run stats with sanity caps, recomputes score,
// AND is the sole writer for run-aggregate fields on PlayerSave (Phase 3c).

// Proper ISO 8601 (Mon-start, Sun 23:59 UTC end) — must mirror lib/periodIds.js.
// Old `getUTCDay() + 1` formula treated Sunday as the start of a new week,
// rolling week_id over a day early (Hugo bug 2026-05-03).
function getCurrentPeriodIds() {
    const now = new Date();
    const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const isoYear = tmp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    const week_id = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${isoYear}-S${seasonNum}`;
    return { week_id, season_id };
}

// Sanity caps (loose) — runs exceeding these are rejected as tampered
const MAX_KILLS_PER_SEC = 200;
// Non-endless gold sanity: baseline 50k + 2000g/kill. Old check (500g/kill) was
// rejecting legitimate stacked-multiplier runs (Synthbeats + VIP10 + relic gold +
// augments + boss auto-credit pools), e.g. a sector with 2 boss kills auto-credits
// 1000g × ~5× multiplier × 2 = 10k from 2 kills alone. New formula leaves comfortable
// headroom for whales while still catching obvious tampering (1.4M gold in 7min etc).
const MAX_GOLD_BASELINE = 50000;
const MAX_GOLD_PER_KILL = 2000;
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
// Time-based endless gold (rebalanced 2026-05-03): client accrues 10 gold/sec × goldMult.
// Server cap = 12/sec — endless was over-rewarding compared to sectors (a 17-min endless
// AFK run earned 25k while a victorious 7-min sector earned ~3-5k). Now scaled down
// so endless feels like a chill grind, not a primary gold farm.
// Hard ceiling 10k = ~14 min × ~720 g/min ceiling.
const ENDLESS_GOLD_PER_SEC = 12;
const ENDLESS_KILLS_PER_SEC = 4;        // ~240/min sustained (kills cap unchanged)
const ENDLESS_GOLD_FLOOR = 1000;        // minimum cap for very short runs
const ENDLESS_KILLS_FLOOR = 600;
const ENDLESS_GOLD_HARD_CEILING = 10000;
const ENDLESS_KILLS_HARD_CEILING = 6000;

// Arena progression — must mirror game/Constants.js ARENAS order EXACTLY.
// Bug 2026-05-01 (Crybel): old order had stale ids ('voidring', 'singularity')
// and was missing 5 arenas, so beating Ethereal Nebula / Crimson Void didn't unlock the next sector.
const ARENA_ORDER = ['station', 'asteroid', 'nebula', 'void', 'plasma', 'crystal', 'moon', 'blackhole', 'mothership', 'dimension'];

// Arena durations (seconds) — must mirror game/Constants.js ARENAS.duration EXACTLY.
// Used to clamp time_survived on sector runs: the engine's `this.time` keeps ticking
// past the arena duration while the final boss is still alive (victory only fires when
// the boss dies). That post-duration tail was inflating time, gold accrual, and score.
// Endless (Infinity) and raid (world_boss_arena) are not clamped — they have no duration.
const ARENA_DURATIONS = {
    station: 180, asteroid: 210, nebula: 240, void: 270, plasma: 300,
    crystal: 330, moon: 360, blackhole: 390, mothership: 420, dimension: 450,
};

// Character unlock kill milestones — must mirror game/CharacterUnlocks.js.
// 10 milestones to cover all 10 characters (1 starter at 0 + 9 unlockable).
// Spacing keeps the early-game cadence (first unlock at 2k stays accessible to
// new players) and stretches the later ones so the full roster is a long-term
// goal rather than something a heavy player completes in a weekend.
// (Old list capped at 20k kills, which only unlocked 5 of the 10 characters
//  via milestones — leaving the other 5 strandable behind admin grants only.)
const KILL_MILESTONES = [0, 2000, 5000, 10000, 20000, 35000, 55000, 80000, 115000, 160000];
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
    let time = Number(scoreData.time_survived) || 0;
    let kills = Number(scoreData.kills) || 0;
    const level = Number(scoreData.level) || 1;
    let gold = Number(scoreData.gold) || 0;
    let fragments = Math.max(0, Math.floor(Number(scoreData.fragments) || 0));

    if (time < MIN_TIME_SEC || time > MAX_TIME_SEC) {
        return { ok: false, reason: `time out of range: ${time}` };
    }

    // Sector clamp: the engine's run timer keeps ticking past arena duration while
    // the final boss is still alive (victory only fires on boss death). That tail
    // was inflating time_survived (e.g. dimension recorded 535s instead of 450s),
    // boosting score's time component AND letting gold/kills accrue past intended
    // run end. Clamp to the arena's stated duration so leaderboards reflect runs
    // that actually fit within the sector budget. Endless / raid are exempt.
    const arenaDuration = ARENA_DURATIONS[scoreData.arena_id];
    if (arenaDuration && time > arenaDuration) {
        time = arenaDuration;
    }
    if (kills < 0 || kills > Math.ceil(time * MAX_KILLS_PER_SEC)) {
        return { ok: false, reason: `kills out of range: ${kills} for ${time}s` };
    }
    if (level < 1 || level > MAX_LEVEL) {
        return { ok: false, reason: `level out of range: ${level}` };
    }
    // For endless AND raid: skip the per-kill gold sanity check.
    // - Endless has its own hard ceiling (ENDLESS_GOLD_HARD_CEILING).
    // - Raid runs are zeroed out below (no gold/kills credit), so the check is irrelevant.
    // (Bug 2026-05-02: Texxy lost gold on early-quit endless runs.
    //  Bug 2026-05-03: Mustard's raid runs were being rejected — pure boss-damage
    //  runs with 0 kills but boss gold drops kept failing this check.)
    const isEndlessRun = scoreData.arena_id === 'endless';
    const isRaidRun = scoreData.arena_id === 'world_boss_arena';
    if (gold < 0) {
        return { ok: false, reason: `gold negative: ${gold}` };
    }
    if (!isEndlessRun && !isRaidRun && gold > MAX_GOLD_BASELINE + (kills * MAX_GOLD_PER_KILL)) {
        return { ok: false, reason: `gold out of range: ${gold} for ${kills} kills (cap=${MAX_GOLD_BASELINE + kills * MAX_GOLD_PER_KILL})` };
    }

    // Raid runs are damage-contribution only — no gold or kill credit to PlayerSave.
    // Players are rewarded via boss milestone claims (claimBossReward), not run gold.
    if (isRaidRun) {
        gold = 0;
        kills = 0;
    }
    // No upper "absurd" gold rejection for endless. Legitimate 25-min runs with
    // stacked Synthbeats + VIP10 + mastery + augments + relic gold mult can produce
    // 100k+ raw gold. The endless ledger cap below clamps to ENDLESS_GOLD_HARD_CEILING
    // anyway, so the only effect of rejecting was deleting Texxy's longest runs
    // (Texxy bug 2026-05-04 — 25-min run, raw gold=176385). Score still uses raw gold.

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
    // Score formula — gold contribution capped relative to kills DURING S5,
    // then DROPPED ENTIRELY from S6 onward (planned 2026-05-06).
    // History: gold weight was ×5, then ×2 (2026-05-02), and gold cap raised to
    // 50000+kills×2000 (very loose). Tijckers still hit 1.36M on a 7:35 sector 10
    // run (231k gold × 2 = 95% of base score). Root cause: stacked goldMult
    // (Synthbeats 1.5× + talents + relic + NFT + VIP + pool bias ≈ 4×) made
    // gold-from-drops scale far faster than skill stats. Mid-S5 fix: cap gold's
    // score contribution at 150g per kill. Permanent S6+ fix: remove gold from
    // the score formula entirely so leaderboards reflect skill (kills/time/level/
    // victory) only. Gold remains 100% an in-game economy currency for upgrades,
    // cosmetics, and forge — just no longer pads leaderboard scores. Endless +
    // raid already have their own caps, so the change effectively only matters
    // in sectors. Auto-flips at the W20→W21 boundary (Mon May 25 2026 00:00 UTC).
    const { week_id: _runWeek, season_id: runSeasonId } = getCurrentPeriodIds();
    const isS6OrLater = runSeasonId !== '2026-S5';
    let goldScoreContribution;
    if (isS6OrLater) {
        goldScoreContribution = 0;
    } else {
        // S5 gold cap: 200g/kill × 1.5 multiplier (was 250 × 2 — Texxy hit 1.5M
        // farming, too high). Farm builds now cap ~750-900k (still respectable for
        // the gold meta they invested in), victory runs still top ~1.2M. Cap → 0 in S6.
        const goldScoreCap = kills * 200;
        goldScoreContribution = Math.min(gold, goldScoreCap) * 1.5;
    }
    // Mid-S5 hotfix v5 (2026-05-07, target: sector 10 victory ≈ 800-900k):
    //  • kills ×45, level² × 15 (unchanged — skill weight stays high)
    //  • victory bonus: 20k + sectorIdx × 22k → 15k + sectorIdx × 16k
    //    (sector 10 victory = 159k bonus — meaningful but not dominant)
    // Net Texxy (789k, lvl 35, 7:09, 55k gold, sector 10 victory): ~836k ✅
    // Net Anubis (700k, lvl 34, 7:23, 14k gold, sector 10 victory): ~647k
    // Net peak (1000k, lvl 42, 9min, 25k gold, sector 10 victory): ~758k
    // Net sector 1 victory (300k, lvl 18, 4min, 5k gold): ~42k
    // Existing S5 leaderboard entries are untouched (recalc applies to new runs only).
    const sectorIdxForBonus = scoreData.arena_id === 'endless' || scoreData.arena_id === 'world_boss_arena'
        ? 0
        : Math.max(0, ARENA_ORDER.indexOf(scoreData.arena_id));
    const victoryBonus = isVictory ? (15000 + sectorIdxForBonus * 16000) : 0;
    const baseScore = kills * 45 + level * level * 15 + time * 5 + goldScoreContribution + victoryBonus;
    // Hard score ceiling — last-line backstop against any validator gap that lets
    // a tampered run slip through with absurd numbers (e.g. gold validator allows
    // 50k + kills × 2k, which on a 10k-kill run permits a 112M score). Realistic
    // maxed legit run on sector 10 victory peaks at ~1.4M, so 2.5M leaves
    // comfortable headroom for future content (more sectors, harder difficulties).
    const SCORE_HARD_CEILING = 2_500_000;
    const score = Math.min(SCORE_HARD_CEILING, Math.floor(baseScore * arenaMult));

    return {
        ok: true, score,
        kills, time, level, gold, fragments, // raw values (for score / leaderboard display)
        goldForLedger, killsForLedger, fragmentsForLedger, // capped values (for PlayerSave aggregation)
        endlessGoldCapped, endlessKillsCapped, fragmentsCapped, isEndless
    };
}

// 429-aware retry helper for Base44 entity calls. Base44 rate-limits aggressively
// during peak (saveScore + spendGold + getSquadProfile + getAdminData all share
// the same bucket). Without this, an endless run that 429s on PlayerSave.update
// or RunScore.create returns 500 → flushPendingScores re-queues it → loop.
// Retries 3× with exponential backoff (300ms → 700ms → 1500ms + jitter).
async function with429Retry(fn, label = 'op') {
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const status = err?.status || err?.response?.status;
            const msg = String(err?.message || '').toLowerCase();
            const is429 = status === 429 || msg.includes('rate limit') || msg.includes('429');
            if (!is429 || attempt === 3) throw err;
            const backoff = 300 * Math.pow(2, attempt) + Math.random() * 200;
            console.warn(`[saveScore] ${label} 429 — retry ${attempt + 1}/3 after ${Math.round(backoff)}ms`);
            await new Promise(r => setTimeout(r, backoff));
        }
    }
    throw lastErr;
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

// Daily Tasks — server-side definitions. Must mirror the labels in DailyTasksPanel.
// All targets are tuned to be completable in 5–15 minutes of normal play.
const DAILY_TASKS_DEFINITIONS = [
    { id: 'dt_first_run',     desc: 'Complete 1 run',                target: 1,   rewardGold: 200, rewardFragments: 0, type: 'play' },
    { id: 'dt_sector_sweep',  desc: 'Survive 60s in a single run',   target: 60,  rewardGold: 300, rewardFragments: 0, type: 'survive' },
    { id: 'dt_kill_streak',   desc: 'Get 100 kills in one run',      target: 100, rewardGold: 250, rewardFragments: 1, type: 'killsRun' },
    { id: 'dt_level_up',      desc: 'Reach level 10 in one run',     target: 10,  rewardGold: 400, rewardFragments: 0, type: 'level' },
    { id: 'dt_diversity',     desc: 'Play 2 different characters',   target: 2,   rewardGold: 500, rewardFragments: 1, type: 'characters' },
];

// Ensure the dailyTasks container exists and is fresh for today (UTC).
// If it's a new day, reset all tasks. Endless runs DO NOT reset/spawn tasks.
function ensureDailyTasks(s) {
    const today = new Date().toISOString().split('T')[0];
    if (!s.dailyTasks || s.dailyTasks.date !== today) {
        s.dailyTasks = {
            date: today,
            tasks: DAILY_TASKS_DEFINITIONS.map(d => ({ ...d, progress: 0, claimed: false })),
            charactersPlayed: []
        };
    } else {
        // Backfill any newly-added task definitions if a player's container is from an earlier today.
        const existingIds = new Set((s.dailyTasks.tasks || []).map(t => t.id));
        for (const def of DAILY_TASKS_DEFINITIONS) {
            if (!existingIds.has(def.id)) {
                s.dailyTasks.tasks.push({ ...def, progress: 0, claimed: false });
            }
        }
        if (!Array.isArray(s.dailyTasks.charactersPlayed)) s.dailyTasks.charactersPlayed = [];
    }
}

// Update daily task progress. Endless runs ARE counted (these are tiny/easy goals,
// not currency-sensitive bounties — anti-farm matters less here and excluding them
// would frustrate endless-only players).
function updateDailyTaskProgress(s, run, charId) {
    ensureDailyTasks(s);
    // Track unique characters played today
    if (charId && !s.dailyTasks.charactersPlayed.includes(charId)) {
        s.dailyTasks.charactersPlayed.push(charId);
    }
    const charsCount = s.dailyTasks.charactersPlayed.length;

    s.dailyTasks.tasks = s.dailyTasks.tasks.map(t => {
        if (t.claimed) return t;
        const updated = { ...t };
        if (t.type === 'play') {
            updated.progress = Math.min(t.target, Number(t.progress || 0) + 1);
        } else if (t.type === 'survive') {
            if (run.time > Number(t.progress || 0)) updated.progress = Math.min(t.target, Math.floor(run.time));
        } else if (t.type === 'killsRun') {
            if (run.kills > Number(t.progress || 0)) updated.progress = Math.min(t.target, run.kills);
        } else if (t.type === 'level') {
            if (run.level > Number(t.progress || 0)) updated.progress = Math.min(t.target, run.level);
        } else if (t.type === 'characters') {
            updated.progress = Math.min(t.target, charsCount);
        }
        return updated;
    });
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

    // Daily Tasks progress — easy 5–15 min goals shown on Star Ops page.
    updateDailyTaskProgress(s, run, charId);

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

        // Idempotency guard — protect against duplicate submissions caused by:
        //  • client refreshing mid-save (browser/proxy retries the in-flight POST),
        //  • flushPendingScores re-queuing a run whose first save actually succeeded,
        //  • double-tap on a "Try Again" button before the first save returned.
        // If an identical run (same wallet + time + kills + level + character) was
        // recorded in the last 2 minutes, treat THIS call as a no-op and return the
        // existing score data. PlayerSave is NOT credited again.
        let duplicateBlocked = false;
        let duplicateScore = 0;
        try {
            const recentRuns = await with429Retry(
                () => base44.asServiceRole.entities.RunScore.filter(
                    { wallet_address: walletAddress },
                    '-created_date',
                    10
                ),
                'dup-check'
            );
            const cutoff = Date.now() - 2 * 60 * 1000;
            const dup = recentRuns.find(r => {
                const createdMs = new Date(r.created_date).getTime();
                return createdMs >= cutoff
                    && Number(r.time_survived) === Number(validation.time)
                    && Number(r.kills) === Number(validation.kills)
                    && Number(r.level) === Number(validation.level)
                    && r.character_id === charId
                    && r.arena_id === scoreData.arena_id;
            });
            if (dup) {
                console.warn(`[saveScore] DUPLICATE blocked for ${walletAddress}: matches RunScore ${dup.id} created ${dup.created_date}. No re-credit.`);
                // Defer the response until AFTER we load the player's current save
                // (line 441 below). Previous code referenced `saveData` here, before
                // it was declared, causing a ReferenceError → 500 → flushPendingScores
                // re-queued the run forever (Texxy/Hugo bug 2026-05-04).
                duplicateBlocked = true;
                duplicateScore = dup.score;
            }
        } catch (dupErr) {
            console.error('[saveScore] dup-check failed (proceeding):', dupErr.message);
        }
        // Cap enemyKills total to the (possibly capped) ledger kills to keep aggregates consistent.
        const sanitisedEnemyKills = sanitiseEnemyKills(scoreData.enemyKills, validation.killsForLedger);

        // Apply run to PlayerSave (server-authoritative aggregation)
        const walletLower = walletAddress.toLowerCase();
        const records = await with429Retry(
            () => base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletLower }),
            'PlayerSave.filter'
        );
        if (records.length === 0) {
            return Response.json({ error: 'We couldn\'t find your save. Please refresh and try again.' }, { status: 400 });
        }
        const saveRecord = records[0];
        const saveData = typeof saveRecord.save_data === 'string'
            ? JSON.parse(saveRecord.save_data)
            : saveRecord.save_data;

        // Now that saveData is loaded, we can safely return the duplicate-blocked
        // response (was the source of the ReferenceError → infinite re-queue loop).
        if (duplicateBlocked) {
            return Response.json({
                success: true,
                score: duplicateScore,
                saveData,
                grantedCharacter: null,
                unlockedArena: null,
                goldCredited: 0,
                killsCredited: 0,
                fragmentsCredited: 0,
                duplicateBlocked: true,
            });
        }

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

        await with429Retry(
            () => base44.asServiceRole.entities.PlayerSave.update(saveRecord.id, {
                save_data: updatedSave,
                updated_at: Date.now()
            }),
            'PlayerSave.update'
        );

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
            await with429Retry(
                () => base44.asServiceRole.entities.RunScore.create(runScore),
                'RunScore.create'
            );
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
                // Parallelize the two reads (Squad.get + SquadWar.filter) — they're
                // independent and previously ran sequentially, doubling the latency
                // window during which other requests pile up against the rate limit.
                // Endless runs skip the war read entirely (anti-farm — wars aren't
                // credited from endless mode anyway).
                const skipWar = validation.isEndless;
                const [squad, activeWars] = await Promise.all([
                    base44.asServiceRole.entities.Squad.get(squadIdToUpdate),
                    skipWar
                        ? Promise.resolve([])
                        : base44.asServiceRole.entities.SquadWar.filter({ week_id, is_resolved: false }).catch(err => {
                            console.error('[saveScore] SquadWar fetch failed:', err.message);
                            return [];
                        }),
                ]);

                const dailyKillsReset = squad.current_day !== today ? 0 : (squad.daily_kills || 0);
                const myWar = skipWar ? null : activeWars.find(w => w.squad_a_id === squadIdToUpdate || w.squad_b_id === squadIdToUpdate);

                // Parallelize the two writes too — Squad.update and SquadWar.update
                // touch different rows and don't depend on each other.
                const writes = [
                    base44.asServiceRole.entities.Squad.update(squadIdToUpdate, {
                        weekly_kills: (squad.weekly_kills || 0) + killsToAdd,
                        daily_kills: dailyKillsReset + killsToAdd,
                        current_day: today,
                    }),
                ];
                if (myWar) {
                    const isSideA = myWar.squad_a_id === squadIdToUpdate;
                    const patch = isSideA
                        ? { kills_a: (myWar.kills_a || 0) + killsToAdd }
                        : { kills_b: (myWar.kills_b || 0) + killsToAdd };
                    writes.push(
                        base44.asServiceRole.entities.SquadWar.update(myWar.id, patch).catch(warErr => {
                            console.error('[saveScore] SquadWar update failed:', warErr.message);
                        })
                    );
                }
                await Promise.all(writes);

                console.log(`[saveScore] Squad ${squadIdToUpdate} +${killsToAdd} kills (weekly=${(squad.weekly_kills || 0) + killsToAdd}, daily=${dailyKillsReset + killsToAdd})${myWar ? ` + War ${myWar.id}` : ''}`);
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