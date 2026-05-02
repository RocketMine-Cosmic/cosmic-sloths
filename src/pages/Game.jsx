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

            // Retry with short backoff so transient network/server hiccups
            // don't lose the player's run. 5 attempts: 0.5s, 1s, 2s, 3s, 4s = ~10.5s total.
            // If all fail, the run is queued to localStorage and retried in the background.
            const delays = [500, 1000, 2000, 3000, 4000];
            let lastErr = null;
            for (let attempt = 0; attempt < delays.length; attempt++) {
                try {
                    const res = await base44.functions.invoke('saveScore', payload);
                    return res?.data || null;
                } catch (e) {
                    lastErr = e;
                    console.warn(`[saveScore] attempt ${attempt + 1}/${delays.length} failed:`, e?.message || e);
                    if (attempt < delays.length - 1) {
                        await new Promise(r => setTimeout(r, delays[attempt]));
                    }
                }
            }

            // All retries failed — queue the run locally so we can retry on next launch.
            try {
                const queue = JSON.parse(localStorage.getItem('pending_score_saves') || '[]');
                queue.push({ payload, queuedAt: Date.now() });
                // Keep queue bounded — 20 most recent runs is plenty.
                while (queue.length > 20) queue.shift();
                localStorage.setItem('pending_score_saves', JSON.stringify(queue));
                console.warn('[saveScore] All retries exhausted — run queued for later retry.');
            } catch (qErr) {
                console.error('[saveScore] Failed to queue run:', qErr);
            }
            console.error('[saveScore] FAILED after retries:', lastErr?.message || lastErr);
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
                // Score is recomputed server-side; show 0 until response arrives.
                stats.score = 0;
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
                            score: res.score,
                            unlockedCharacter: res.grantedCharacter || null,
                            // Show server-credited values (endless mode caps gold/kills)
                            gold: res.goldCredited ?? s.gold,
                            kills: res.killsCredited ?? s.kills,
                            endlessGoldCapped: res.endlessGoldCapped,
                            endlessKillsCapped: res.endlessKillsCapped,
                        }));
                    }
                }).catch(err => {
                    console.error('[Game] saveScore failed:', err);
                    // Unblock the modal so the player isn't stuck on the spinner forever.
                    // Show their client-side estimate so the buttons render and they can continue.
                    setGameOverStats(s => ({ ...s, score: s.score || 1, _saveFailed: true }));
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
                stats.score = 0;
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
                            score: res.score,
                            unlockedCharacter: res.grantedCharacter || null,
                            gold: res.goldCredited ?? s.gold,
                            kills: res.killsCredited ?? s.kills,
                            endlessGoldCapped: res.endlessGoldCapped,
                            endlessKillsCapped: res.endlessKillsCapped,
                        }));
                    }
                }).catch(err => {
                    console.error('[Game] saveScore failed:', err);
                    // Unblock the modal so the player isn't stuck on the spinner forever.
                    setVictoryStats(s => ({ ...s, score: s.score || 1, _saveFailed: true }));
                });
                
                if (stats.worldBossDamage > 0) {
                    const user = getOmenXUserSync();
                    base44.functions.invoke('submitBossDamage', { damage: stats.worldBossDamage, playerName: user?.player_name || user?.full_name })
                        .catch(err => console.error('Failed to submit boss damage', err));
                }
            }
        }, isEndless, worldBossId, worldBossName, startingWeaponId, location.state?.isNGPlus || false);
        
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
                // to record a different one — Hugo bug 2026-04-30 (bullet_hell mismatch).
                const arenaIndex = ARENAS.findIndex(a => a.id === engine.arena?.id);
                const isEndlessRun = engine.arena?.duration === Infinity;
                const arenaMultiplier = isEndlessRun ? 2.0 : 1.0 + (Math.max(0, arenaIndex) * 0.2);
                const baseScore = engine.kills * 10 + engine.level * 100 + engine.time * 5 + engine.gold * 5;
                const liveScore = Math.floor(baseScore * arenaMultiplier);

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
                    kills: engine.kills || 0,
                    totalDamage: Math.floor(engine.totalDamageDealt || 0)
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
        if (engineRef.current) {
            engineRef.current.applyUpgrade(upgrade);
            // Brief grace period so the player has a moment to reposition before
            // enemies start moving again. UpgradeSystem sets isPaused=true on level-up;
            // keep it paused for 1.5s after the modal closes.
            engineRef.current.isPaused = true;
            setTimeout(() => {
                if (engineRef.current && !engineRef.current.isGameOver && !engineRef.current.isVictory) {
                    engineRef.current.lastTime = performance.now(); // prevent dt spike
                    engineRef.current.isPaused = false;
                }
            }, 1500);
        }
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
        const { characterId, arenaId, difficultyId, isEndless, worldBossId, worldBossName, startingWeaponId, isNGPlus } = location.state || {};
        navigate('/game', {
            state: { characterId, arenaId, difficultyId, isEndless, worldBossId, worldBossName, startingWeaponId, isNGPlus, _retry: Date.now() },
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
            // Mirrors onGameOver's saveScore call but awaited so it survives unmount.
            const isEndless = engine.arena?.duration === Infinity;
            await saveScoreRef.current?.(stats, false, isEndless);
            if (stats.worldBossDamage > 0) {
                const user = getOmenXUserSync();
                base44.functions.invoke('submitBossDamage', { damage: stats.worldBossDamage, playerName: user?.player_name || user?.full_name }).catch(() => {});
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