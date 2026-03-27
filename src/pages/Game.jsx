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
import { base44 } from '@/api/base44Client';
import moment from 'moment';

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

    useEffect(() => {
        const { characterId, arenaId } = location.state || { characterId: 'neobyte', arenaId: 'station' };
        const save = SaveManager.load();
        
        const canvas = canvasRef.current;
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const saveScore = async (stats, isVictory) => {
            try {
                const user = await base44.auth.me();
                const playerName = user ? user.full_name : 'Anonymous Sloth';
                const score = stats.kills * 10 + stats.level * 100 + stats.time * 5 + stats.gold * 20 + (isVictory ? 5000 : 0);
                const week_id = moment().format('YYYY-[W]ww');
                
                const weekNum = moment().week();
                const seasonNum = Math.floor(weekNum / 4) + 1;
                const season_id = `${moment().format('YYYY')}-S${seasonNum}`;
                
                await base44.entities.RunScore.create({
                    player_name: playerName,
                    score: score,
                    time_survived: stats.time,
                    level: stats.level,
                    kills: stats.kills,
                    character_id: stats.characterId || characterId,
                    arena_id: stats.arenaId || arenaId,
                    week_id: week_id,
                    season_id: season_id
                });
            } catch (e) {
                console.error('Failed to save score', e);
            }
        };

        const engine = new GameEngine(canvas, characterId, arenaId, save, {
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
                SaveManager.save(currentSave);
                setGameOverStats(stats);
                saveScore(stats, false);
            },
            onVictory: (stats) => {
                const currentSave = SaveManager.load();
                currentSave.gold += stats.gold;
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
                setVictoryStats(stats);
                saveScore(stats, true);
            }
        });
        
        engineRef.current = engine;
        
        setGameState({
            hp: engine.player.hp, maxHp: engine.player.maxHp,
            time: 0, duration: engine.arena.duration, level: 1, xp: 0, xpRequired: 10, gold: 0,
            rerollTokens: save.rerollTokens || 0
        });

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            engine.cleanup();
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
        if (currentSave.rerollTokens > 0) {
            currentSave.rerollTokens -= 1;
            SaveManager.save(currentSave);
            setGameState(s => ({ ...s, rerollTokens: currentSave.rerollTokens }));
            if (engineRef.current) {
                engineRef.current.isPaused = false; // Temporarily unpause to allow levelUp to pause again
                engineRef.current.levelUp();
            }
        }
    };

    const handleJoystickChange = (pos) => {
        if (engineRef.current) {
            engineRef.current.joystick = pos;
        }
    };

    return (
        <div className="w-screen h-screen overflow-hidden bg-black relative select-none">
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0"
            />
            
            <VirtualJoystick onChange={handleJoystickChange} />
            
            <UIOverlay {...gameState} />
            
            {levelUpChoices && (
                <LevelUpModal choices={levelUpChoices} onSelect={handleUpgradeSelect} rerollTokens={gameState.rerollTokens} onReroll={handleReroll} />
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