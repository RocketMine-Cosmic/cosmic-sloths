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

export default function Game() {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    
    const [gameState, setGameState] = useState({
        hp: 100, maxHp: 100,
        time: 0, duration: 300, level: 1,
        xp: 0, xpRequired: 10,
        gold: 0
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

        const engine = new GameEngine(canvas, characterId, arenaId, save, {
            onHpChange: (hp, maxHp) => setGameState(s => ({ ...s, hp, maxHp })),
            onTimeChange: (time) => setGameState(s => ({ ...s, time })),
            onGoldChange: (gold) => setGameState(s => ({ ...s, gold })),
            onLevelUp: (choices) => {
                setGameState(s => ({ ...s, level: engine.level, xp: engine.xp, xpRequired: engine.xpRequired }));
                setLevelUpChoices(choices);
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
            }
        });
        
        engineRef.current = engine;
        
        setGameState({
            hp: engine.player.hp, maxHp: engine.player.maxHp,
            time: 0, duration: engine.arena.duration, level: 1, xp: 0, xpRequired: 10, gold: 0
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
                <LevelUpModal choices={levelUpChoices} onSelect={handleUpgradeSelect} />
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