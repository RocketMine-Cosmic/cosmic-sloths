import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GameEngine } from '../game/GameEngine';
import { SaveManager } from '../game/SaveManager';
import UIOverlay from '../components/game/UIOverlay';
import LevelUpModal from '../components/game/LevelUpModal';
import { ARENAS } from '../game/Constants';
import GameOverModal from '../components/game/GameOverModal';
import VictoryModal from '../components/game/VictoryModal';
import VirtualJoystick from '../components/game/VirtualJoystick';
import PauseModal from '../components/game/PauseModal';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';

export default function Game() {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    
    const [gameState, setGameState] = useState({
        hp: 100, maxHp: 100,
        time: 0, duration: 300, level: 1,
        xp: 0, xpRequired: 10,
        gold: 0, rerollTokens: 0
    });
    
    const [levelUpChoices, setLevelUpChoices] = useState(null);
    const [gameOverStats, setGameOverStats] = useState(null);
    const [victoryStats, setVictoryStats] = useState(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const { characterId, arenaId, difficultyId, isEndless } = location.state || { characterId: 'neobyte', arenaId: 'station', difficultyId: 'normal', isEndless: false };
        const save = SaveManager.load();
        
        const canvas = canvasRef.current;
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const updateBounties = (currentSave, stats) => {
            if (currentSave.bounties && currentSave.bounties.active) {
                currentSave.bounties.active.forEach(bounty => {
                    if (bounty.type === 'kills') {
                        bounty.progress += stats.kills;
                    } else if (bounty.type === 'survive') {
                        if (stats.time > bounty.progress) {
                            bounty.progress = stats.time;
                        }
                    } else if (bounty.type === 'gold') {
                        if (stats.gold > bounty.progress) {
                            bounty.progress = stats.gold;
                        }
                    } else if (bounty.type === 'level') {
                        if (stats.level > bounty.progress) {
                            bounty.progress = stats.level;
                        }
                    } else if (bounty.type === 'play') {
                        bounty.progress += 1;
                    }
                });
            }
            if (currentSave.bounties && currentSave.bounties.dailyMission) {
                const mission = currentSave.bounties.dailyMission;
                if (mission.type === 'kills') mission.progress += stats.kills;
                else if (mission.type === 'survive') { if (stats.time > mission.progress) mission.progress = stats.time; }
                else if (mission.type === 'gold') { if (stats.gold > mission.progress) mission.progress = stats.gold; }
                else if (mission.type === 'level') { if (stats.level > mission.progress) mission.progress = stats.level; }
                else if (mission.type === 'play') mission.progress += 1;
            }
        };

        const saveScore = async (stats, isVictory) => {
            try {
                const user = await base44.auth.me();
                if (!user) {
                    console.error('saveScore: No authenticated user found, skipping score save.');
                    return;
                }

                // RLS requires player_name === user.full_name exactly
                const playerName = user.full_name;
                if (!playerName) {
                    console.error('saveScore: user has no full_name, skipping score save.');
                    return;
                }
                console.log('saveScore: saving for', playerName, '| isVictory:', isVictory, '| arenaId:', stats.arenaId || arenaId, '| isEndless:', isEndless);
                
                // Add kills to squad if user is in one
                try {
                    const memberships = await base44.entities.SquadMember.filter({ user_id: user.id });
                    if (memberships.length > 0) {
                        const squadId = memberships[0].squad_id;
                        const squad = await base44.entities.Squad.get(squadId);
                        if (squad) {
                            await base44.entities.Squad.update(squad.id, {
                                weekly_kills: (squad.weekly_kills || 0) + stats.kills
                            });
                        }
                    }
                } catch(err) {
                    console.error('Failed to update squad kills', err);
                }
                
                const arenaIndex = ARENAS.findIndex(a => a.id === (stats.arenaId || arenaId));
                const arenaMultiplier = isEndless ? 3.0 : 1.0 + (Math.max(0, arenaIndex) * 0.2);
                const baseScore = stats.kills * 10 + stats.level * 100 + stats.time * 5 + stats.gold * 20 + (isVictory ? 5000 : 0);
                
                const currentSaveForScore = SaveManager.load();
                const bulletHellMult = (currentSaveForScore.bossModifiers && currentSaveForScore.bossModifiers.bullet_hell) ? 1.3 : 1.0;
                
                const score = Math.floor(baseScore * arenaMultiplier * bulletHellMult);
                
                const week_id = moment().format('YYYY-[W]ww');
                const weekNum = moment().week();
                const seasonNum = Math.floor(weekNum / 4) + 1;
                const season_id = `${moment().format('YYYY')}-S${seasonNum}`;

                console.log('saveScore: computed score =', score, '| week_id:', week_id, '| season_id:', season_id);
                
                const result = await base44.entities.RunScore.create({
                    player_name: playerName,
                    score: score,
                    time_survived: stats.time,
                    level: stats.level,
                    kills: stats.kills,
                    character_id: stats.characterId || characterId,
                    arena_id: isEndless ? 'endless' : (stats.arenaId || arenaId),
                    week_id: week_id,
                    season_id: season_id
                });
                console.log('saveScore: SUCCESS, created RunScore id:', result?.id);
            } catch (e) {
                console.error('saveScore: FAILED to save score:', e?.message || e, e?.response?.data || '');
            }
        };

        // Inject skin color override into save so GameEngine can read it
        const SKIN_COLORS = {
            neobyte_crimson: '#DC143C', neobyte_gold: '#FFD700',
            pandypaws_obsidian: '#222222', pandypaws_ice: '#00CFFF',
            novabyte_void: '#8A2BE2', novabyte_neon: '#39FF14',
            glitch_red: '#FF0000', glitch_white: '#FFFFFF',
            holodrift_amber: '#FFA500',
            codebreaker_pink: '#FF1493',
            dataphantom_ghost: '#C0C0C0',
            neonvortex_plasma: '#00E5FF',
            synthbeats_violet: '#9400D3',
            skybyte_solar: '#FF6600',
        };
        const equippedSkinId = save.cosmetics?.skins?.[characterId];
        if (equippedSkinId && SKIN_COLORS[equippedSkinId]) {
            save.skinColorOverride = SKIN_COLORS[equippedSkinId];
        }

        const engine = new GameEngine(canvas, characterId, arenaId, difficultyId, save, {
            onHpChange: (hp, maxHp) => setGameState(s => ({ ...s, hp, maxHp })),
            onTimeChange: (time) => setGameState(s => ({ ...s, time })),
            onGoldChange: (gold) => setGameState(s => ({ ...s, gold })),
            onLevelUp: (choices) => {
                setGameState(s => ({ ...s, level: engine.level, xp: engine.xp, xpRequired: engine.xpRequired }));
                setLevelUpChoices(choices);
            },
            onRerollFound: () => {
                const currentSave = SaveManager.load();
                currentSave.rerollTokens = (currentSave.rerollTokens || 0) + 1;
                SaveManager.save(currentSave);
                setGameState(s => ({ ...s, rerollTokens: currentSave.rerollTokens }));
            },
            onTokenFound: () => {
                const currentSave = SaveManager.load();
                currentSave.cosmicTokens = (currentSave.cosmicTokens || 0) + 1;
                SaveManager.save(currentSave);
                setGameState(s => ({ ...s, cosmicTokens: currentSave.cosmicTokens }));
            },
            onCharacterFound: (charId) => {
                const currentSave = SaveManager.load();
                if (!currentSave.foundCharacters.includes(charId)) {
                    currentSave.foundCharacters.push(charId);
                    if (!currentSave.unlockedCharacters.includes(charId)) {
                        currentSave.unlockedCharacters.push(charId);
                    }
                    SaveManager.save(currentSave);
                }
            },
            onGameOver: (stats) => {
                const currentSave = SaveManager.load();
                currentSave.gold += stats.gold;
                currentSave.totalKills = (currentSave.totalKills || 0) + stats.kills;
                currentSave.maxTimeSurvived = Math.max(currentSave.maxTimeSurvived || 0, stats.time);
                currentSave.totalGoldEarned = (currentSave.totalGoldEarned || 0) + stats.gold;
                currentSave.maxLevelReached = Math.max(currentSave.maxLevelReached || 0, stats.level);
                updateBounties(currentSave, stats);
                if (stats.encountered) {
                    currentSave.encounteredEnemies = [...new Set([...(currentSave.encounteredEnemies || []), ...stats.encountered])];
                }
                if (stats.enemyKills) {
                    if (!currentSave.enemyKills) currentSave.enemyKills = {};
                    for (const [id, count] of Object.entries(stats.enemyKills)) {
                        currentSave.enemyKills[id] = (currentSave.enemyKills[id] || 0) + count;
                    }
                }
                SaveManager.save(currentSave);
                const currentSaveForGameOver = SaveManager.load();
                const goArenaIndex = ARENAS.findIndex(a => a.id === arenaId);
                const goArenaMult = isEndless ? 3.0 : 1.0 + (Math.max(0, goArenaIndex) * 0.2);
                const goBase = stats.kills * 10 + stats.level * 100 + stats.time * 5 + stats.gold * 20;
                const goBHMult = (currentSaveForGameOver.bossModifiers?.bullet_hell) ? 1.3 : 1.0;
                stats.score = Math.floor(goBase * goArenaMult * goBHMult);
                setGameOverStats(stats);
                saveScore(stats, false);
            },
            onVictory: (stats) => {
                const currentSave = SaveManager.load();
                currentSave.gold += stats.gold;
                currentSave.totalKills = (currentSave.totalKills || 0) + stats.kills;
                currentSave.maxTimeSurvived = Math.max(currentSave.maxTimeSurvived || 0, stats.time);
                currentSave.totalGoldEarned = (currentSave.totalGoldEarned || 0) + stats.gold;
                currentSave.maxLevelReached = Math.max(currentSave.maxLevelReached || 0, stats.level);
                updateBounties(currentSave, stats);
                if (stats.encountered) {
                    currentSave.encounteredEnemies = [...new Set([...(currentSave.encounteredEnemies || []), ...stats.encountered])];
                }
                if (stats.enemyKills) {
                    if (!currentSave.enemyKills) currentSave.enemyKills = {};
                    for (const [id, count] of Object.entries(stats.enemyKills)) {
                        currentSave.enemyKills[id] = (currentSave.enemyKills[id] || 0) + count;
                    }
                }
                const currentIndex = ARENAS.findIndex(a => a.id === stats.arenaId);
                if (currentIndex >= 0 && currentIndex < ARENAS.length - 1) {
                    const nextArena = ARENAS[currentIndex + 1];
                    if (!currentSave.unlockedArenasByCharacter[stats.characterId]) {
                        currentSave.unlockedArenasByCharacter[stats.characterId] = ['station'];
                    }
                    if (!currentSave.unlockedArenasByCharacter[stats.characterId].includes(nextArena.id)) {
                        currentSave.unlockedArenasByCharacter[stats.characterId].push(nextArena.id);
                    }
                }
                SaveManager.save(currentSave);
                const currentSaveForVictory = SaveManager.load();
                const vicArenaIndex = ARENAS.findIndex(a => a.id === stats.arenaId);
                const vicArenaMult = isEndless ? 3.0 : 1.0 + (Math.max(0, vicArenaIndex) * 0.2);
                const vicBase = stats.kills * 10 + stats.level * 100 + stats.time * 5 + stats.gold * 20 + 5000;
                const vicBHMult = (currentSaveForVictory.bossModifiers?.bullet_hell) ? 1.3 : 1.0;
                stats.score = Math.floor(vicBase * vicArenaMult * vicBHMult);
                setVictoryStats(stats);
                saveScore(stats, true);
            }
        }, isEndless);
        
        engineRef.current = engine;
        
        setGameState({
            hp: engine.player.hp, maxHp: engine.player.maxHp,
            time: 0, duration: engine.arena.duration, level: 1, xp: 0, xpRequired: 10, gold: 0,
            rerollTokens: save.rerollTokens || 0,
            cosmicTokens: save.cosmicTokens || 0
        });
        
        SoundManager.init();
        SoundManager.playBGM();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            engine.cleanup();
            SoundManager.stopBGM();
        };
    }, [location.state]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (engineRef.current && !engineRef.current.isPaused) {
                setGameState(s => ({
                    ...s,
                    xp: engineRef.current.xp,
                    xpRequired: engineRef.current.xpRequired
                }));
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleUpgradeSelect = (upgrade) => {
        if (engineRef.current) {
            engineRef.current.applyUpgrade(upgrade);
        }
        setLevelUpChoices(null);
    };

    const handleReroll = () => {
        const currentSave = SaveManager.load();
        const REROLL_COST = 10;
        if ((currentSave.cosmicTokens || 0) >= REROLL_COST) {
            currentSave.cosmicTokens -= REROLL_COST;
            SaveManager.save(currentSave);
            setGameState(s => ({ ...s, cosmicTokens: currentSave.cosmicTokens }));
            
            const week_id = moment().format('YYYY-[W]ww');
            const seasonNum = Math.floor(moment().week() / 4) + 1;
            const season_id = `${moment().format('YYYY')}-S${seasonNum}`;
            base44.functions.invoke('recordTokenSpend', { amount: REROLL_COST, week_id, season_id }).catch(console.error);

            if (engineRef.current) {
                engineRef.current.rerollChoices();
            }
        }
    };

    const handleJoystickChange = (pos) => {
        if (engineRef.current) {
            engineRef.current.joystick = pos;
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
            engineRef.current.isPaused = false;
            setIsPaused(false);
        }
    };

    return (
        <div className="w-screen h-[100dvh] overflow-hidden bg-black relative select-none">
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0"
            />
            
            <VirtualJoystick onChange={handleJoystickChange} />
            
            <UIOverlay {...gameState} onPause={handlePause} />
            
            {isPaused && (
                <PauseModal onResume={handleResume} />
            )}

            {levelUpChoices && (
                <LevelUpModal level={gameState.level} choices={levelUpChoices} onSelect={handleUpgradeSelect} cosmicTokens={gameState.cosmicTokens} onReroll={handleReroll} />
            )}
            
            {gameOverStats && (
                <GameOverModal stats={gameOverStats} />
            )}
            
            {victoryStats && (
                <VictoryModal stats={victoryStats} />
            )}
        </div>
    );
}