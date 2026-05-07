import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GameEngine } from '../game/GameEngine';
import { SaveManager } from '../game/SaveManager';
import UIOverlay from '../components/game/UIOverlay';
import LevelUpModal from '../components/game/LevelUpModal';
import { ARENAS, SKIN_COSMETICS } from '../game/Constants';
import GameOverModal from '../components/game/GameOverModal';
import VictoryModal from '../components/game/VictoryModal';
import VirtualJoystick from '../components/game/VirtualJoystick';
import PauseModal from '../components/game/PauseModal';
import OmenXConfirmation from '../components/game/OmenXConfirmation';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { IN_GAME_SKUS } from '@/lib/skuMap';
import { SoundManager } from '../game/SoundManager';
import { useCurrency } from '@/lib/CurrencyContext';
import { getOmenXUserSync } from '@/lib/omenxUser';
import { getCurrentPeriodIds } from '@/lib/periodIds';
import { useOmenXConfirmation } from '@/hooks/useOmenXConfirmation';
import { getAuthData } from '@/lib/getAuthData';
import { SpritePreloader } from '../game/SpritePreloader';
import { refreshBalance } from '@/lib/playerDataCache';
import { flushPendingScores } from '@/lib/flushPendingScores';
import CharacterAbilityMeter from '../components/game/CharacterAbilityMeter';
import GameLoadingScreen from '../components/game/GameLoadingScreen';
import HideHudButton from '../components/game/HideHudButton';
import SynergyBanner from '../components/game/SynergyBanner';
import SessionExpiredBanner from '../components/game/SessionExpiredBanner';
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive';

export default function Game() {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { omenxBalance } = useCurrency();
    
    const [gameState, setGameState] = useState({
        hp: 100, maxHp: 100,
        time: 0, duration: 300, level: 1,
        xp: 0, xpRequired: 10,
        gold: 0, relicFragments: 0
    });
    
    const [levelUpChoices, setLevelUpChoices] = useState(null);
    const [gameOverStats, setGameOverStats] = useState(null);
    const [victoryStats, setVictoryStats] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [showRevivePrompt, setShowRevivePrompt] = useState(false);
    const [banishCount, setBanishCount] = useState(0); // resets per run (component remounts on new game)
    const [isInitializing, setIsInitializing] = useState(true);
    const [hudHidden, setHudHidden] = useState(false);
    const saveScoreRef = useRef(null);
    const { pending, setPending, confirm: confirmPurchase } = useOmenXConfirmation('game-run');

    // Banish tier: 3 uses at 2 OMENX, 3 uses at 4 OMENX, then 6 OMENX onwards.
    // SKU is 2 OMENX consumable → fire `cost / 2` separate charges per banish.
    const getBanishCost = (count) => {
        if (count < 3) return 2;
        if (count < 6) return 4;
        return 6;
    };
    const banishCost = getBanishCost(banishCount);
    const nextBanishCost = getBanishCost(banishCount + 1);

    // Endless runs only: ping base44.auth.me() every 10 min to keep the Base44
    // session warm. Without this, runs over ~1hr expire and saveScore fails
    // with 401 at run-end. Disabled outside endless to avoid pointless traffic
    // on short fixed-duration arenas.
    const isEndlessRun = !!location.state?.isEndless;
    useSessionKeepAlive(isEndlessRun && !gameOverStats && !victoryStats);

    // Android tab-kill safety: when the page is being torn down (phone lock,
    // app switch, low memory eviction), dump the current run stats to localStorage
    // synchronously so flushPendingScores can recover them on next launch.
    // `pagehide` is more reliable than `beforeunload` on mobile browsers.
    useEffect(() => {
        const onPageHide = () => {
            const engine = engineRef.current;
            if (!engine || engine.isGameOver || engine.isVictory) return;
            const arena = engine.arena?.id;
            if (arena !== 'endless' && arena !== 'world_boss_arena') return;
            try {
                const stats = engine._runStats();
                if ((stats.kills || 0) >= 5 && (stats.time || 0) >= 30) {
                    localStorage.setItem('pending_run_snapshot', JSON.stringify({ stats, takenAt: Date.now() }));
                }
            } catch {}
        };
        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', resizeCanvas);
        resizeCanvas();

        // Reset modal/state from any previous run so the new game starts clean
        setGameOverStats(null);
        setVictoryStats(null);
        setLevelUpChoices(null);
        setShowRevivePrompt(false);
        setIsPaused(false);
        // Reset per-run banish counter so "Try Again" doesn't carry over the
        // previous run's tier-up cost (Hugo bug 2026-04-30).
        setBanishCount(0);

        const initGame = async () => {
            const { characterId, arenaId, difficultyId, isEndless, worldBossId, worldBossName, startingWeaponId } = location.state || { characterId: 'neobyte', arenaId: 'station', difficultyId: 'normal', isEndless: false };
            // NG+ removed — ignore any legacy isNGPlus state passed via navigation.
            
            // CRITICAL: Initialize SaveManager first to load cloud save + merge upgrades
            await SaveManager.initialize();
            // Try to flush any runs queued from a previous failed save (background, non-blocking)
            flushPendingScores().catch(() => {});
            
            const save = SaveManager.load();

            // Increment daily raid-run counter when a raid run starts (covers Try Again
            // and any other entry path that bypasses GlobalRaid's launch handler).
            if (arenaId === 'world_boss_arena') {
                const todayDate = new Date().toISOString().split('T')[0];
                if (!save.raidRuns) save.raidRuns = {};
                save.raidRuns[todayDate] = (save.raidRuns[todayDate] || 0) + 1;
                SaveManager.save(save);
            }

        const saveScore = async (stats, isVictory) => {
            const user = getOmenXUserSync();
            if (!user) return null;
            const displayName = user.player_name || user.full_name;
            const walletAddress = user.walletAddress;

            if (!displayName || displayName.includes('@') || displayName.includes('0x') || displayName.trim() === '') {
                console.warn('[saveScore] No proper pilot name — score not recorded');
                return null;
            }

            const arena_id = isEndless ? 'endless' : (stats.arenaId || arenaId);
            const pilotIcon = user.pilot_icon || user.data?.pilot_icon || '🦥';

            // Server validates, recomputes score, and writes run aggregates to PlayerSave.
            const scoreData = {
                player_name: displayName,
                player_title: user.data?.player_title || '',
                pilot_icon: pilotIcon,
                time_survived: stats.time,
                level: stats.level,
                kills: stats.kills,
                character_id: stats.characterId || characterId,
                arena_id,
                gold: stats.gold,
                fragments: stats.fragments || 0,
                is_victory: !!isVictory,
                encountered: stats.encountered || [],
                enemyKills: stats.enemyKills || {},
            };

            // Read squad membership from local cache to avoid a network round-trip
            let squadStats = null;
            try {
                const cached = localStorage.getItem(`squad_membership_${walletAddress}`);
                if (cached) {
                    squadStats = { squadId: JSON.parse(cached).squad_id, kills: stats.kills };
                }
            } catch (_) {}

            const payload = { scoreData, squadStats };

            // Retry with tight backoff. Most saves succeed on the first attempt
            // (logs show 1-3s end-to-end). When 429s hit, we want to retry quickly
            // — not stretch to 10s+ waits that blow past the modal's 25s timeout.
            // 4 attempts: 250ms, 500ms, 1s, 2s = ~3.75s total waits + ~2s exec each
            // = worst case ~12s, comfortably under the modal timeout.
            // EXCEPTION: 401 (auth expired — long endless runs outlive the session)
            // bails out immediately and queues the run, since retrying won't fix auth.
            const delays = [250, 500, 1000, 2000];
            let lastErr = null;
            let authExpired = false;
            for (let attempt = 0; attempt < delays.length; attempt++) {
                try {
                    const res = await base44.functions.invoke('saveScore', payload);
                    return res?.data || null;
                } catch (e) {
                    lastErr = e;
                    const status = e?.response?.status || e?.status;
                    const msg = (e?.message || '').toLowerCase();
                    // Detect expired Base44 session — happens on long runs (>1hr endless).
                    if (status === 401 || msg.includes('authentication required') || msg.includes('unauthorized')) {
                        authExpired = true;
                        console.warn('[saveScore] Session expired during run — queueing for next launch.');
                        break; // skip remaining retries
                    }
                    console.warn(`[saveScore] attempt ${attempt + 1}/${delays.length} failed:`, e?.message || e);
                    if (attempt < delays.length - 1) {
                        await new Promise(r => setTimeout(r, delays[attempt]));
                    }
                }
            }

            // All retries failed (or auth expired) — queue the run locally so we can retry on next launch.
            try {
                const queue = JSON.parse(localStorage.getItem('pending_score_saves') || '[]');
                queue.push({ payload, queuedAt: Date.now(), reason: authExpired ? 'auth_expired' : 'network' });
                // Keep queue bounded — 20 most recent runs is plenty.
                while (queue.length > 20) queue.shift();
                localStorage.setItem('pending_score_saves', JSON.stringify(queue));
                console.warn('[saveScore] Run queued for later retry.', authExpired ? '(auth expired)' : '');
            } catch (qErr) {
                console.error('[saveScore] Failed to queue run:', qErr);
            }
            console.error('[saveScore] FAILED:', lastErr?.message || lastErr);
            // Tag error so the UI can show a more specific message.
            if (lastErr) lastErr._authExpired = authExpired;
            throw lastErr;
        };
        // Expose to handleQuit so it can await the save before unmounting.
        saveScoreRef.current = saveScore;

        // Inject skin color override into save so GameEngine can read it
        const equippedSkinId = save.cosmetics?.skins?.[characterId];
        if (equippedSkinId) {
            const skin = SKIN_COSMETICS.find(s => s.id === equippedSkinId);
            if (skin) {
                save.skinColorOverride = skin.color;
            }
        }

        // Inject live OMENX balance so GameEngine can gate the revive prompt correctly
        save.omenxBalance = omenxBalance ?? 0;

        // For Global Raid runs: fetch the cloud boss's current HP/max HP so the
        // in-game HP bar reflects the current global state (not a hardcoded value).
        // Other players' damage will be polled in via the live sync below.
        if (arenaId === 'world_boss_arena') {
            try {
                const { getCurrentPeriodIds } = await import('@/lib/periodIds');
                const { week_id } = getCurrentPeriodIds();
                const bosses = await base44.entities.GlobalBoss.filter({ week_id });
                if (bosses.length > 0) {
                    save.worldBossCloudMaxHp = bosses[0].max_hp;
                    save.worldBossCloudCurrentHp = bosses[0].current_hp;
                    save.worldBossCloudLevel = bosses[0].level || 1;
                }
            } catch (e) {
                console.warn('[Game] Failed to fetch global boss state:', e);
            }
        }

        // Inject equipped title buff so GameEngine can apply it as small permanent bonus
        try {
            const u = getOmenXUserSync();
            const equippedTitle = u?.data?.player_title;
            if (equippedTitle) {
                const { getTitleBuff } = await import('@/lib/playerTitles');
                save.titleBuff = getTitleBuff(equippedTitle);
            }
        } catch (e) {
            // No buff applied — title registry unavailable
        }

        // Tiny perk for staff/admins — +2% to base stats. Client-side, cached per session.
        try {
            const { getAdminBuff } = await import('@/lib/adminBuff');
            const adminBuff = await getAdminBuff();
            if (adminBuff) save.adminBuff = adminBuff;
        } catch (e) {
            // Not an admin or check failed — no buff applied
        }

        // Inject NFT multipliers from playerDataCache so GameEngine can apply them
        try {
            const { fetchPlayerData } = await import('@/lib/playerDataCache');
            const playerDataModule = await import('@/lib/playerDataCache');
            // Read cached NFT data synchronously from cache
            const cachedNftData = (() => { try { return JSON.parse(localStorage.getItem('omenx_nft_data')); } catch { return null; } })();
            if (cachedNftData && Array.isArray(cachedNftData) && cachedNftData.length > 0) {
                const { NFTPerkManager } = await import('../game/NFTPerks');
                NFTPerkManager.applyNFTPerks(cachedNftData);
                const charPerks = NFTPerkManager.getCharacterPerks(characterId, cachedNftData);
                save.nftGoldMultiplier = charPerks.goldMultiplier;
                save.nftRelicMultiplier = charPerks.relicFragmentMultiplier;
            }
        } catch (e) {
            // NFT data unavailable — no bonus applied
        }

        const engine = new GameEngine(canvas, characterId, arenaId, difficultyId, save, {
            onHpChange: (hp, maxHp) => setGameState(s => ({ ...s, hp, maxHp })),
            onTimeChange: (time) => setGameState(s => ({ ...s, time })),
            onGoldChange: (gold) => setGameState(s => ({ ...s, gold })),
            onLevelUp: (choices) => {
                setGameState(s => ({ ...s, level: engine.level, xp: engine.xp, xpRequired: engine.xpRequired }));
                setLevelUpChoices(choices);
            },
            onFragmentFound: (amount) => {
                // Per-run pickup display only. The server credits PlayerSave.relicFragments
                // at run end (saveScore validates engine.runFragments and bumps the cloud).
                // Do NOT write relicFragments to localStorage here — syncSave treats it as
                // server-owned and blocks any client bump.
                setGameState(s => ({ ...s, relicFragments: (s.relicFragments || 0) + amount }));
            },
            onTokenFound: () => {
                const save = localStorage.getItem('cosmic_sloth_save') ? JSON.parse(localStorage.getItem('cosmic_sloth_save')) : SaveManager.load();
                save.cosmicTokens = (save.cosmicTokens || 0) + 1;
                SaveManager.save(save);
                setGameState(s => ({ ...s, cosmicTokens: save.cosmicTokens }));
            },
            onDeathPrompt: () => {
                setShowRevivePrompt(true);
            },
            onCharacterFound: (charId) => {
                const save = localStorage.getItem('cosmic_sloth_save') ? JSON.parse(localStorage.getItem('cosmic_sloth_save')) : SaveManager.load();
                if (!save.foundCharacters.includes(charId)) {
                    save.foundCharacters.push(charId);
                    if (!save.unlockedCharacters.includes(charId)) {
                        save.unlockedCharacters.push(charId);
                    }
                    SaveManager.save(save);
                }
            },
            onGameOver: (stats) => {
                stats.difficultyId = difficultyId;
                stats.isEndless = isEndless;
                stats.startingWeaponId = startingWeaponId;
                stats.worldBossId = worldBossId;
                stats.worldBossName = worldBossName;
                // Server is the SOLE source of truth for credited gold/kills/fragments/score.
                // We DO NOT pre-fill these on the modal — instead the modal shows a spinner
                // for those rows until the server response lands (or shows "queued for retry"
                // if it times out). This prevents the historical bug where the modal showed
                // "+3528 gold (capped)" but the save had timed out and the actual credited
                // amount was unknown. Time/Level/Kills/Damage are unambiguous (just what
                // happened in the run, no server caps apply) and remain visible immediately.
                stats.score = null;
                setGameOverStats(stats);
                // Server validates run, applies aggregates to PlayerSave, returns updated save.
                saveScore(stats, false).then((res) => {
                    if (res?.success) {
                        // Apply server-truthful save (includes gold/kills/bounty progress + relicFragments).
                        // Preserve client-owned fields that saveScore doesn't touch — otherwise the
                        // server response would wipe any UI prefs / cosmetics the player edited
                        // between their last sync and this run (e.g. jukebox toggles, SFX categories,
                        // selected character/arena, equipped cosmetics).
                        if (res.saveData) {
                            const localSave = SaveManager.load();
                            const merged = {
                                ...res.saveData,
                                cosmicTokens: Math.max(Number(res.saveData.cosmicTokens || 0), Number(localSave?.cosmicTokens || 0)),
                                // Client-owned UI prefs — never overwrite with cloud's older copy.
                                jukeboxPrefs: localSave?.jukeboxPrefs ?? res.saveData.jukeboxPrefs,
                                sfxCategories: localSave?.sfxCategories ?? res.saveData.sfxCategories,
                                cosmetics: localSave?.cosmetics ?? res.saveData.cosmetics,
                                lastSelectedChar: localSave?.lastSelectedChar ?? res.saveData.lastSelectedChar,
                                lastSelectedArena: localSave?.lastSelectedArena ?? res.saveData.lastSelectedArena,
                                lastSelectedDifficulty: localSave?.lastSelectedDifficulty ?? res.saveData.lastSelectedDifficulty,
                                lastSelectedWeapon: localSave?.lastSelectedWeapon ?? res.saveData.lastSelectedWeapon,
                                equippedRelics: localSave?.equippedRelics ?? res.saveData.equippedRelics,
                                poolBias: localSave?.poolBias ?? res.saveData.poolBias,
                            };
                            SaveManager.save(merged);
                        }
                        setGameOverStats(s => ({
                            ...s,
                            _serverConfirmed: true,
                            score: res.score,
                            unlockedCharacter: res.grantedCharacter || null,
                            // Server-credited values are now authoritative.
                            gold: res.goldCredited ?? 0,
                            kills: res.killsCredited ?? s.kills,
                            fragments: res.fragmentsCredited ?? s.fragments,
                            endlessGoldCapped: res.endlessGoldCapped,
                            endlessKillsCapped: res.endlessKillsCapped,
                            fragmentsCapped: res.fragmentsCapped,
                        }));
                    }
                }).catch(err => {
                    console.error('[Game] saveScore failed:', err);
                    // Unblock the modal so the player can continue. Do NOT fill in
                    // gold/fragments/score — the modal will show "queued for retry"
                    // for those rows instead of fake numbers.
                    setGameOverStats(s => ({ ...s, _saveFailed: true, _authExpired: !!err?._authExpired }));
                });
                
                if (stats.worldBossDamage > 0) {
                    const user = getOmenXUserSync();
                    base44.functions.invoke('submitBossDamage', { damage: stats.worldBossDamage, playerName: user?.player_name || user?.full_name })
                        .catch(err => console.error('Failed to submit boss damage', err));
                }
            },
            onVictory: (stats) => {
                stats.difficultyId = difficultyId;
                stats.isEndless = isEndless;
                stats.startingWeaponId = startingWeaponId;
                stats.worldBossId = worldBossId;
                stats.worldBossName = worldBossName;
                // Same as game-over — server is sole source of truth for credited
                // gold/kills/fragments/score. Modal shows spinner for those rows
                // until response lands.
                stats.score = null;
                setVictoryStats(stats);
                // Server validates run, applies aggregates + arena unlock + char milestone, returns updated save.
                saveScore(stats, true).then((res) => {
                    if (res?.success) {
                        // Server now credits relicFragments — preserve only cosmicTokens + client-owned UI prefs.
                        // (Same protection as the game-over path — see comment there.)
                        if (res.saveData) {
                            const localSave = SaveManager.load();
                            const merged = {
                                ...res.saveData,
                                cosmicTokens: Math.max(Number(res.saveData.cosmicTokens || 0), Number(localSave?.cosmicTokens || 0)),
                                jukeboxPrefs: localSave?.jukeboxPrefs ?? res.saveData.jukeboxPrefs,
                                sfxCategories: localSave?.sfxCategories ?? res.saveData.sfxCategories,
                                cosmetics: localSave?.cosmetics ?? res.saveData.cosmetics,
                                lastSelectedChar: localSave?.lastSelectedChar ?? res.saveData.lastSelectedChar,
                                lastSelectedArena: localSave?.lastSelectedArena ?? res.saveData.lastSelectedArena,
                                lastSelectedDifficulty: localSave?.lastSelectedDifficulty ?? res.saveData.lastSelectedDifficulty,
                                lastSelectedWeapon: localSave?.lastSelectedWeapon ?? res.saveData.lastSelectedWeapon,
                                equippedRelics: localSave?.equippedRelics ?? res.saveData.equippedRelics,
                                poolBias: localSave?.poolBias ?? res.saveData.poolBias,
                            };
                            SaveManager.save(merged);
                        }
                        setVictoryStats(s => ({
                            ...s,
                            _serverConfirmed: true,
                            score: res.score,
                            unlockedCharacter: res.grantedCharacter || null,
                            gold: res.goldCredited ?? 0,
                            kills: res.killsCredited ?? s.kills,
                            fragments: res.fragmentsCredited ?? s.fragments,
                            endlessGoldCapped: res.endlessGoldCapped,
                            endlessKillsCapped: res.endlessKillsCapped,
                            fragmentsCapped: res.fragmentsCapped,
                        }));
                    }
                }).catch(err => {
                    console.error('[Game] saveScore failed:', err);
                    setVictoryStats(s => ({ ...s, _saveFailed: true, _authExpired: !!err?._authExpired }));
                });
                
                if (stats.worldBossDamage > 0) {
                    const user = getOmenXUserSync();
                    base44.functions.invoke('submitBossDamage', { damage: stats.worldBossDamage, playerName: user?.player_name || user?.full_name })
                        .catch(err => console.error('Failed to submit boss damage', err));
                }
            }
        }, isEndless, worldBossId, worldBossName, startingWeaponId);
        
        engineRef.current = engine;
        
        setGameState({
            hp: engine.player.hp, maxHp: engine.player.maxHp,
            time: 0, duration: engine.arena.duration, level: engine.level, xp: engine.xp, xpRequired: engine.xpRequired, gold: 0,
            relicFragments: save.relicFragments || 0,
            cosmicTokens: save.cosmicTokens || 0,
            score: 0
        });
        
        SoundManager.init();
        SoundManager.setContext('game');
        SoundManager.playBGM();
        
        // Preload all character sprites in background (non-blocking)
        SpritePreloader.preload();

        setIsInitializing(false);
        };
        
        initGame();
        
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('orientationchange', resizeCanvas);
            if (engineRef.current) {
                engineRef.current.cleanup();
            }
            SoundManager.stopBGM();
            SoundManager.setContext('menu');
        };
    }, [location.state]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (engineRef.current && !engineRef.current.isPaused) {
                const engine = engineRef.current;
                // Mirror the server's score formula EXACTLY (functions/saveScore.js).
                // Any divergence here causes the HUD to show one number and the leaderboard
                // to record a different one — Hugo bug 2026-04-30 (bullet_hell mismatch),
                // raid-arena 2× mismatch 2026-05-04 (HUD treated raid as endless via the
                // duration===Infinity check — server gave it 1.0×).
                // Hardcoded list MUST match saveScore.js ARENA_ORDER exactly.
                const ARENA_ORDER = ['station', 'asteroid', 'nebula', 'void', 'plasma', 'crystal', 'moon', 'blackhole', 'mothership', 'dimension'];
                const arenaId = engine.arena?.id;
                let arenaMultiplier;
                if (arenaId === 'endless') {
                    arenaMultiplier = 2.0;
                } else {
                    const idx = ARENA_ORDER.indexOf(arenaId);
                    arenaMultiplier = 1.0 + (Math.max(0, idx) * 0.2);
                }
                // Endless caps — must mirror saveScore.js (ENDLESS_GOLD_PER_SEC=12,
                // ENDLESS_KILLS_PER_SEC=4, hard ceilings 10000/6000, floors 1000/600).
                // The caps apply to PlayerSave aggregation (ledger), NOT to score.
                // The server's score formula uses RAW kills+gold, so the HUD must too —
                // otherwise the HUD score under-reports vs the end-of-run modal.
                // (Capped values are still used for the displayed kill/gold tiles via
                // UIOverlay.displayGold and `kills: killsForScore` below — those are
                // the wallet-credited numbers and must stay capped.)
                const isEndlessHud = arenaId === 'endless';
                const killsForScore = engine.kills; // RAW for score formula
                const goldForScore = engine.gold;   // RAW for score formula
                let killsForDisplay = engine.kills;
                if (isEndlessHud) {
                    const t = engine.time || 0;
                    killsForDisplay = Math.min(engine.kills, Math.min(6000, Math.max(600, Math.floor(t * 4))));
                }
                // Server also adds +5000 victory bonus, but is_victory only fires at the
                // very final tick — the modal shows the server's authoritative value, so
                // omitting it from the live HUD is intentional (less than 1s of skew).
                //
                // CRITICAL: gold's contribution to the score is capped at kills×150 by
                // the server (see saveScore.js goldScoreCap). Without mirroring that cap
                // here, whales with stacked gold mults see a wildly inflated HUD score
                // that gets clipped on submit — players reasonably interpret the gap as
                // "the game stole my points". Mirror the cap so HUD = server.
                // S6+ drops gold from the score entirely (server logic auto-flips at the
                // season boundary). Mirror that too via period detection so the HUD
                // doesn't keep showing gold contribution after the rollover.
                const { season_id: hudSeasonId } = getCurrentPeriodIds();
                const isS6OrLater = hudSeasonId !== '2026-S5';
                let goldScoreContribution;
                if (isS6OrLater) {
                    goldScoreContribution = 0;
                } else {
                    // S5 gold cap raised to 250g/kill (mirror saveScore.js).
                    const goldScoreCap = killsForScore * 250;
                    goldScoreContribution = Math.min(goldForScore, goldScoreCap) * 2;
                }
                // Mid-S5 hotfix v3 (2026-05-07): kills ×30, level² ×10. Mirrors saveScore.js.
                // Victory bonus is omitted from the live HUD (only added on final tick by server).
                const baseScore = killsForScore * 30 + engine.level * engine.level * 10 + engine.time * 5 + goldScoreContribution;
                // Server also enforces a 2.5M hard ceiling — mirror it so the HUD never
                // shows a score the leaderboard will refuse to record.
                const SCORE_HARD_CEILING = 2_500_000;
                const liveScore = Math.min(SCORE_HARD_CEILING, Math.floor(baseScore * arenaMultiplier));

                // Rolling 10s window so post-boss/late upgrades show up in the HUD immediately.
                const dps = engine.getRollingDps ? Math.floor(engine.getRollingDps()) : 0;

                // Find active boss for off-screen HP bar
                let boss = null;
                if (engine.isBossActive && engine.enemies) {
                    const b = engine.enemies.find(e => e && e.isBoss && e.hp > 0);
                    if (b) boss = { name: b.name, hp: b.hp, maxHp: b.maxHp };
                }

                setGameState(s => ({
                    ...s,
                    xp: engine.xp,
                    xpRequired: engine.xpRequired,
                    weapons: engine.player.weapons || [],
                    passives: engine.player.passives || [],
                    score: liveScore,
                    dps,
                    boss,
                    // Display the capped (wallet-credited) kill count — score formula
                    // uses RAW kills above; this tile shows what gets banked.
                    kills: killsForDisplay || 0,
                    killsCapped: isEndlessHud && engine.kills > killsForDisplay,
                    totalDamage: Math.floor(engine.totalDamageDealt || 0),
                    xpBuffActive: !!engine.player?.xpBuffActive,
                    xpBuffExpiry: engine.xpBuffExpiry || 0,
                }));
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Keep the engine's view of omenxBalance in sync with the live cached value.
    // Must depend on omenxBalance so it re-syncs every time the cache updates
    // (e.g. after refreshBalance() following a purchase).
    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.save.omenxBalance = omenxBalance ?? 0;
        }
    }, [omenxBalance]);

    const purchaseSku = async (skuId, quantity = 1) => {
        if (!skuId) return;
        const user = getOmenXUserSync();
        const playerName = user?.player_name || user?.full_name || 'Pilot';
        return base44.functions.invoke('purchaseSku', { skuId, quantity, playerName })
            .then(r => r.data)
            .catch(e => console.error('[Game purchaseSku] failed:', e?.message));
    };

    const handleUpgradeSelect = (upgrade) => {
        const engine = engineRef.current;
        if (!engine) { setLevelUpChoices(null); return; }
        engine.applyUpgrade(upgrade);
        // If applyUpgrade caused another level-up (XP overflow), wait for the next modal.
        if (engine.xp >= engine.xpRequired && !engine.isGameOver && !engine.isVictory) {
            setLevelUpChoices(null);
            return;
        }
        // Resume immediately, but grant 0.5s of invulnerability so players who get
        // ambushed mid-modal don't die instantly. (Replaced 1.5s pause that felt like lag.)
        engine.lastTime = performance.now();
        engine.player.iFrames = Math.max(engine.player.iFrames || 0, 0.5);
        engine.player.invincibleTimer = Math.max(engine.player.invincibleTimer || 0, 0.5);
        engine.isPaused = false;
        setLevelUpChoices(null);
    };

    const handleReroll = () => {
        const REROLL_COST = 2;
        if ((omenxBalance ?? 0) >= REROLL_COST) {
            confirmPurchase(REROLL_COST, 'Reroll Upgrades', () => {
                // Grant immediately, pay in background (fire-and-forget)
                if (engineRef.current) engineRef.current.rerollChoices();
                purchaseSku(IN_GAME_SKUS.reroll); // no await
                refreshBalance(); // no await
            });
        }
    };

    const handleBanish = (choice) => {
        const cost = banishCost;
        if ((omenxBalance ?? 0) >= cost) {
            const tierLabel = cost === 1 ? 'Tier 1' : cost === 2 ? 'Tier 2' : 'Tier 3';
            confirmPurchase(cost, `Banish Upgrade (${tierLabel})`, () => {
                // Grant immediately, pay in background (fire-and-forget)
                if (engineRef.current) {
                    engineRef.current.banishUpgrade(choice.id);
                    engineRef.current.rerollChoices();
                }
                // Pick the right tiered SKU — T1 (2), T2 (4), or T3 (6 OMENX). Single charge per banish.
                const banishSku = cost === 2 ? IN_GAME_SKUS.banish
                                : cost === 4 ? IN_GAME_SKUS.banishT2
                                : IN_GAME_SKUS.banishT3;
                purchaseSku(banishSku);
                refreshBalance(); // no await
                setBanishCount(c => c + 1);
            });
        }
    };

    const handleJoystickChange = (pos) => {
        if (engineRef.current) {
            engineRef.current.joystick = pos;
        }
    };

    const handleSquadUltimate = (tier = 'full') => {
        const cost = tier === 'lite' ? 5 : 10;
        const itemName = tier === 'lite' ? 'Squad Lite (capped power)' : 'Squad Ultimate (full power)';
        const skuId = tier === 'lite' ? IN_GAME_SKUS.squadUltimateLite : IN_GAME_SKUS.squadUltimateFull;
        if ((omenxBalance ?? 0) >= cost && engineRef.current && !engineRef.current.isPaused) {
            confirmPurchase(cost, itemName, () => {
                // Grant immediately, pay in background
                engineRef.current.triggerSquadUltimate(tier);
                purchaseSku(skuId);
                refreshBalance();
            });
        }
    };

    const handlePause = () => {
        if (engineRef.current && !engineRef.current.isGameOver && !engineRef.current.isVictory && !levelUpChoices) {
            engineRef.current.isPaused = true;
            setIsPaused(true);
        }
    };

    const handleResume = () => {
        if (engineRef.current) {
            // Close the modal immediately, but keep the engine paused for 1.5s
            // so the player has a beat to grab their joystick before action resumes.
            setIsPaused(false);
            setTimeout(() => {
                if (engineRef.current && !engineRef.current.isGameOver && !engineRef.current.isVictory) {
                    engineRef.current.lastTime = performance.now(); // prevent dt spike
                    engineRef.current.isPaused = false;
                }
            }, 1500);
        }
    };

    const handleRestart = () => {
        const engine = engineRef.current;
        if (!engine) return;
        const { characterId, arenaId, difficultyId, isEndless, worldBossId, worldBossName, startingWeaponId } = location.state || {};
        navigate('/game', {
            state: { characterId, arenaId, difficultyId, isEndless, worldBossId, worldBossName, startingWeaponId, _retry: Date.now() },
            replace: true,
        });
    };

    const [isQuitting, setIsQuitting] = useState(false);
    const handleQuit = async () => {
        const engine = engineRef.current;
        const isRaid = engine?.arena?.id === 'world_boss_arena';
        const target = isRaid ? '/?slide=11' : '/';
        const navState = { state: { slide: isRaid ? 11 : 1 } };

        if (!engine || engine.isGameOver || engine.isVictory) {
            navigate(target, navState);
            return;
        }
        // Endless / abandoned runs: must await saveScore before navigating away,
        // otherwise unmount cancels the in-flight fetch and progress is lost.
        setIsQuitting(true);
        engine.isPaused = false;
        engine.isGameOver = true;
        const stats = {
            time: Math.floor(engine.time),
            level: engine.level,
            kills: engine.kills,
            gold: engine.gold,
            fragments: engine.runFragments || 0,
            characterId: engine.characterId,
            arenaId: engine.arena?.id,
            encountered: Array.from(engine.encounteredEnemies),
            enemyKills: engine.enemyKills,
            worldBossDamage: engine.worldBossDamage || 0,
            _suppressModal: true,
        };
        try {
            // Quit is a "clean" exit — clear any safety snapshot SYNCHRONOUSLY
            // BEFORE saveScore so a hot-reload/refresh mid-save can't re-queue it.
            try { localStorage.removeItem('pending_run_snapshot'); } catch {}
            // Mirrors onGameOver's saveScore call but awaited so it survives unmount.
            await saveScoreRef.current?.(stats, false);
            // Also await boss damage submission so raid contributions aren't dropped
            // when the navigate() unmounts the component mid-flight.
            if (stats.worldBossDamage > 0) {
                const user = getOmenXUserSync();
                try {
                    await base44.functions.invoke('submitBossDamage', { damage: stats.worldBossDamage, playerName: user?.player_name || user?.full_name });
                } catch (bossErr) {
                    console.warn('[Game] submitBossDamage on quit failed:', bossErr?.message);
                }
            }
        } catch (e) {
            console.error('[Game] handleQuit save failed:', e);
        } finally {
            navigate(target, navState);
        }
    };

    const handleRevive = () => {
        if ((omenxBalance ?? 0) >= 4) {
            confirmPurchase(4, 'Emergency Revive', () => {
                // Grant immediately, pay in background
                if (engineRef.current) {
                    engineRef.current.player.hp = engineRef.current.player.maxHp * 0.5;
                    engineRef.current.player.iFrames = 3.0;
                    engineRef.current.player.invincibleTimer = 3.0;
                    engineRef.current.player.hasRevivedWithTokens = true;
                    engineRef.current.isPaused = false;
                    setShowRevivePrompt(false);
                }
                purchaseSku(IN_GAME_SKUS.revive);
                refreshBalance();
            });
        }
    };

    const handleDeclineRevive = () => {
        setShowRevivePrompt(false);
        if (engineRef.current) {
            engineRef.current.isPaused = false;
            engineRef.current.player.hasRevivedWithTokens = true;
            engineRef.current.particleManager.createExplosion(engineRef.current.player.x, engineRef.current.player.y, engineRef.current.player.color, 3, engineRef.current.characterId);
            engineRef.current.gameOver();
        }
    };

    React.useEffect(() => {
        // Disable pull-to-refresh on mobile — but allow touchmove inside interactive
        // controls (range sliders, modals, scrollable content) so volume sliders and
        // other UI inputs work correctly on mobile.
        const preventPullToRefresh = (e) => {
            if (!e.touches || e.touches.length === 0 || window.scrollY !== 0) return;
            const t = e.target;
            if (t && t.closest && t.closest('input[type="range"], [data-allow-touchmove], .overflow-y-auto, [role="dialog"]')) return;
            e.preventDefault();
        };
        document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
        return () => document.removeEventListener('touchmove', preventPullToRefresh);
    }, []);

    // Keyboard pause hotkeys: Escape or P toggles pause/resume.
    React.useEffect(() => {
        const onKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key !== 'escape' && key !== 'p') return;
            const engine = engineRef.current;
            if (!engine || engine.isGameOver || engine.isVictory) return;
            // Don't toggle while a level-up or revive prompt is open.
            if (levelUpChoices || showRevivePrompt) return;
            if (engine.isPaused) {
                handleResume();
            } else {
                handlePause();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [levelUpChoices, showRevivePrompt]);

    return (
        <div className="w-screen h-[100dvh] overflow-hidden bg-black relative select-none" style={{ overscrollBehavior: 'none' }}>
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0"
            />
            
            {!hudHidden && <VirtualJoystick onChange={handleJoystickChange} />}
            
            {!hudHidden && <UIOverlay {...gameState} omenxBalance={omenxBalance ?? 0} onPause={handlePause} onSquadUltimate={handleSquadUltimate} />}
            {!hudHidden && <CharacterAbilityMeter engineRef={engineRef} />}
            {!hudHidden && <SynergyBanner />}
            {!hudHidden && <SessionExpiredBanner />}

            {hudHidden && (
                <HideHudButton onShow={() => setHudHidden(false)} />
            )}

            {isPaused && !hudHidden && (
                <PauseModal
                    onResume={handleResume}
                    onQuit={handleQuit}
                    onRestart={handleRestart}
                    onHideHud={() => { setHudHidden(true); }}
                    engineRef={engineRef}
                />
            )}

            {levelUpChoices && (
                <LevelUpModal level={gameState.level} choices={levelUpChoices} onSelect={handleUpgradeSelect} cosmicTokens={omenxBalance ?? 0} onReroll={handleReroll} onBanish={handleBanish} banishCost={banishCost} banishCount={banishCount} nextBanishCost={nextBanishCost} engineRef={engineRef} />
            )}
            
            {showRevivePrompt && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-slate-900 border-2 border-emerald-500 p-6 md:p-8 rounded-xl max-w-md w-full text-center">
                        <h2 className="text-2xl font-bold text-white mb-2 font-mono">CRITICAL DAMAGE</h2>
                        <p className="text-slate-400 mb-6">Operative system failing. Use an Emergency Revive?</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleRevive}
                                disabled={(omenxBalance ?? 0) < 4}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold flex flex-wrap items-center justify-center gap-2 transition-colors"
                            >
                                REVIVE (50% HP) <span className="bg-slate-900 px-2 py-1 rounded text-xs">COST: 4 OMENX</span>
                            </button>
                            <button
                                onClick={handleDeclineRevive}
                                className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-bold border border-slate-700 transition-colors"
                            >
                                ACCEPT FATE
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {gameOverStats && !gameOverStats._suppressModal && (
                <GameOverModal stats={gameOverStats} />
            )}
            
            {victoryStats && (
                <VictoryModal stats={victoryStats} />
            )}
            
            {pending && (
                <OmenXConfirmation
                    amount={pending.amount}
                    itemName={pending.itemName}
                    onConfirm={pending.onConfirm}
                    onCancel={pending.onCancel}
                    pageId="game-run"
                />
            )}

            {isInitializing && <GameLoadingScreen />}

            {isQuitting && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[70]">
                    <div className="flex flex-col items-center gap-3 text-cyan-300">
                        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        <div className="font-mono font-bold tracking-widest text-sm">SAVING RUN…</div>
                    </div>
                </div>
            )}
        </div>
    );
}