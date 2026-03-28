import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, ARENAS, DIFFICULTIES } from '../game/Constants';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';

export default function Hub({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const [selectedChar, setSelectedChar] = useState('neobyte');
    const [selectedArena, setSelectedArena] = useState('station');
    const [selectedDifficulty, setSelectedDifficulty] = useState('normal');
    const { toast } = useToast();
    const touchStartX = React.useRef(null);

    React.useEffect(() => {
        const claimRewards = async () => {
            try {
                const user = await base44.auth.me();
                if (!user) return;
                const pending = await base44.entities.PendingReward.filter({ player_name: user.full_name, claimed: false });
                if (pending.length > 0) {
                    let totalAmount = 0;
                    for (const reward of pending) {
                        totalAmount += reward.amount;
                        await base44.entities.PendingReward.update(reward.id, { claimed: true });
                    }
                    const newSave = { ...save, cosmicTokens: (save.cosmicTokens || 0) + totalAmount };
                    SaveManager.save(newSave);
                    setSave(newSave);
                    toast({
                        title: "Rewards Claimed!",
                        description: `You received ${totalAmount} Cosmic Tokens from leaderboards!`,
                    });
                }
            } catch (e) {
                console.error(e);
            }
        };
        claimRewards();
    }, []);

    const recordTokenSpend = (amount) => {
        const week_id = moment().format('YYYY-[W]ww');
        const seasonNum = Math.floor(moment().week() / 4) + 1;
        const season_id = `${moment().format('YYYY')}-S${seasonNum}`;
        base44.functions.invoke('recordTokenSpend', { amount, week_id, season_id }).catch(console.error);
    };

    const handleBuyCharacter = (char, currency = 'gold') => {
        if (save.unlockedCharacters.includes(char.id)) return;
        
        const tokenCost = Math.max(1, Math.floor(char.cost / 4));

        if (currency === 'gold' && save.gold >= char.cost) {
            const newSave = { 
                ...save, 
                gold: save.gold - char.cost,
                unlockedCharacters: [...save.unlockedCharacters, char.id]
            };
            SaveManager.save(newSave);
            setSave(newSave);
            setSelectedChar(char.id);
        } else if (currency === 'token' && (save.cosmicTokens || 0) >= tokenCost) {
            const newSave = { 
                ...save, 
                cosmicTokens: (save.cosmicTokens || 0) - tokenCost,
                unlockedCharacters: [...save.unlockedCharacters, char.id]
            };
            SaveManager.save(newSave);
            setSave(newSave);
            setSelectedChar(char.id);
            recordTokenSpend(tokenCost);
        }
    };

    const startGame = () => {
        SoundManager.playUIClick();
        navigate('/game', { state: { characterId: selectedChar, arenaId: selectedArena, difficultyId: selectedDifficulty } });
    };



    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} bg-slate-950 text-slate-200 p-4 pb-24 md:p-8 font-mono`}>
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 border-b border-slate-800 pb-4">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-4 h-4" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 tracking-tight">SLOTH LOUNGE</h1>
                        <p className="text-slate-400 mt-1 text-sm md:text-base">Rest, upgrade, and prepare for the cosmic void.</p>
                    </div>
                    <div className="flex gap-2 md:gap-4">
                        <div className="text-base md:text-lg font-bold text-purple-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg" title="Reroll Tokens">
                            🎲 {save.rerollTokens || 0}
                        </div>
                        <div className="text-base md:text-lg font-bold text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg" title="Cosmic Tokens (Crypto)">
                            💠 {save.cosmicTokens || 0}
                        </div>
                        <div className="text-base md:text-lg font-bold text-yellow-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg" title="Gold">
                            🪙 {save.gold}
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-8">
                    <div className="flex-1 bg-slate-900 rounded-2xl p-4 md:p-8 border border-slate-800 min-h-[500px] md:min-h-[600px]">
                        <div className="h-full flex flex-col justify-between">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Mission Briefing</h2>
                                    
                                    <div className="mb-6 md:mb-8">
                                        <h3 className="text-sm md:text-base text-slate-400 mb-2">Select Operative</h3>
                                        <div 
                                            className="relative bg-slate-800 rounded-xl border border-cyan-500 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.3)] select-none touch-pan-y"
                                            onTouchStart={(e) => {
                                                touchStartX.current = e.changedTouches[0].screenX;
                                            }}
                                            onTouchEnd={(e) => {
                                                if (touchStartX.current === null) return;
                                                const touchEndX = e.changedTouches[0].screenX;
                                                const diff = touchStartX.current - touchEndX;
                                                if (diff > 50) {
                                                    const idx = CHARACTERS.findIndex(c => c.id === selectedChar);
                                                    setSelectedChar(CHARACTERS[idx >= CHARACTERS.length - 1 ? 0 : idx + 1].id);
                                                    SoundManager.playUIClick();
                                                } else if (diff < -50) {
                                                    const idx = CHARACTERS.findIndex(c => c.id === selectedChar);
                                                    setSelectedChar(CHARACTERS[idx <= 0 ? CHARACTERS.length - 1 : idx - 1].id);
                                                    SoundManager.playUIClick();
                                                }
                                                touchStartX.current = null;
                                            }}
                                        >
                                            {(() => {
                                                const char = CHARACTERS.find(c => c.id === selectedChar);
                                                const isUnlocked = save.unlockedCharacters.includes(char.id);
                                                const canAfford = save.gold >= char.cost;
                                                const isFindable = ['glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte'].includes(char.id);
                                                
                                                return (
                                                    <>
                                                        <div 
                                                            className="absolute inset-0 opacity-80 bg-contain bg-no-repeat transition-all duration-500"
                                                            style={{ backgroundImage: char.image ? `url(${char.image})` : 'none', backgroundPosition: '85% center' }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent" />
                                                        
                                                        <div className="relative flex items-center justify-between p-4 min-h-[140px]">
                                                            <button 
                                                                onClick={() => {
                                                                    const idx = CHARACTERS.findIndex(c => c.id === selectedChar);
                                                                    const newIdx = idx <= 0 ? CHARACTERS.length - 1 : idx - 1;
                                                                    setSelectedChar(CHARACTERS[newIdx].id);
                                                                    SoundManager.playUIClick();
                                                                }}
                                                                className="p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                            >
                                                                <ChevronLeft className="w-6 h-6" />
                                                            </button>
                                                            
                                                            <div className="text-left z-10 flex-1 px-4 flex flex-col items-start">
                                                                <h4 className="text-xl md:text-2xl font-bold text-white mb-1 drop-shadow-md" style={{ color: char.color }}>
                                                                    {char.name}
                                                                </h4>
                                                                <p className="text-xs text-slate-300 mb-2 max-w-[70%]">
                                                                    {char.desc}
                                                                </p>
                                                                <div className="flex gap-2 text-[10px] md:text-xs mb-2 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50">
                                                                    <span className="text-slate-300">HP: <span className="text-white">{char.hp}</span></span>
                                                                    <span className="text-slate-300">SPD: <span className="text-white">{char.speed}</span></span>
                                                                    <span className="text-slate-300">ARM: <span className="text-white">{char.armor}</span></span>
                                                                </div>
                                                                
                                                                {!isUnlocked && !isFindable && (
                                                                    <div className="flex gap-2 mt-1">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleBuyCharacter(char, 'gold'); }}
                                                                            disabled={!canAfford}
                                                                            className={`px-3 py-1 rounded font-bold text-xs ${
                                                                                canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-500'
                                                                            }`}
                                                                        >
                                                                            🪙 {char.cost}
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleBuyCharacter(char, 'token'); }}
                                                                            disabled={(save.cosmicTokens || 0) < Math.max(1, Math.floor(char.cost / 4))}
                                                                            className={`px-3 py-1 rounded font-bold text-xs ${
                                                                                (save.cosmicTokens || 0) >= Math.max(1, Math.floor(char.cost / 4)) ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'
                                                                            }`}
                                                                        >
                                                                            💠 {Math.max(1, Math.floor(char.cost / 4))}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {!isUnlocked && isFindable && (
                                                                    <div className="px-3 py-1 rounded font-bold text-xs bg-slate-700 text-slate-400 border border-slate-600 mt-1">
                                                                        🔍 Find in Maps
                                                                    </div>
                                                                )}
                                                                {isUnlocked && (
                                                                    <span className="inline-flex items-center gap-1 text-cyan-400 font-bold text-xs bg-slate-900/80 px-2 py-1 rounded border border-cyan-500/50 backdrop-blur-sm mt-1">
                                                                        ✓ UNLOCKED
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <button 
                                                                onClick={() => {
                                                                    const idx = CHARACTERS.findIndex(c => c.id === selectedChar);
                                                                    const newIdx = idx >= CHARACTERS.length - 1 ? 0 : idx + 1;
                                                                    setSelectedChar(CHARACTERS[newIdx].id);
                                                                    SoundManager.playUIClick();
                                                                }}
                                                                className="p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                            >
                                                                <ChevronRight className="w-6 h-6" />
                                                            </button>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm md:text-base text-slate-400 mb-2">Select Arena</h3>
                                        <div 
                                            className="relative bg-slate-800 rounded-xl border border-cyan-500 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.3)] select-none touch-pan-y"
                                            onTouchStart={(e) => {
                                                touchStartX.current = e.changedTouches[0].screenX;
                                            }}
                                            onTouchEnd={(e) => {
                                                if (touchStartX.current === null) return;
                                                const touchEndX = e.changedTouches[0].screenX;
                                                const diff = touchStartX.current - touchEndX;
                                                if (diff > 50) {
                                                    const idx = ARENAS.findIndex(a => a.id === selectedArena);
                                                    setSelectedArena(ARENAS[idx >= ARENAS.length - 1 ? 0 : idx + 1].id);
                                                    SoundManager.playUIClick();
                                                } else if (diff < -50) {
                                                    const idx = ARENAS.findIndex(a => a.id === selectedArena);
                                                    setSelectedArena(ARENAS[idx <= 0 ? ARENAS.length - 1 : idx - 1].id);
                                                    SoundManager.playUIClick();
                                                }
                                                touchStartX.current = null;
                                            }}
                                        >
                                            <div 
                                                className="absolute inset-0 opacity-40 bg-cover bg-center transition-all duration-500"
                                                style={{ backgroundImage: `url(${ARENAS.find(a => a.id === selectedArena)?.image})` }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                                            
                                            <div className="relative flex items-center justify-between p-4 min-h-[120px]">
                                                <button 
                                                    onClick={() => {
                                                        const idx = ARENAS.findIndex(a => a.id === selectedArena);
                                                        const newIdx = idx <= 0 ? ARENAS.length - 1 : idx - 1;
                                                        setSelectedArena(ARENAS[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                >
                                                    <ChevronLeft className="w-6 h-6" />
                                                </button>
                                                
                                                <div className="text-center z-10 flex-1 px-4">
                                                    <h4 className="text-xl md:text-2xl font-bold text-white mb-1 drop-shadow-md">
                                                        {ARENAS.find(a => a.id === selectedArena)?.name}
                                                    </h4>
                                                    {!(save.unlockedArenasByCharacter[selectedChar] || ['station']).includes(selectedArena) ? (
                                                        <span className="inline-flex items-center gap-1 text-red-400 font-bold text-sm bg-red-900/80 px-2 py-1 rounded border border-red-500/50 backdrop-blur-sm">
                                                            🔒 LOCKED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-cyan-400 font-bold text-sm bg-slate-900/80 px-2 py-1 rounded border border-cyan-500/50 backdrop-blur-sm">
                                                            ✓ UNLOCKED
                                                        </span>
                                                    )}
                                                </div>

                                                <button 
                                                    onClick={() => {
                                                        const idx = ARENAS.findIndex(a => a.id === selectedArena);
                                                        const newIdx = idx >= ARENAS.length - 1 ? 0 : idx + 1;
                                                        setSelectedArena(ARENAS[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                >
                                                    <ChevronRight className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 md:mt-8">
                                        <h3 className="text-sm md:text-base text-slate-400 mb-2">Cosmic Difficulty</h3>
                                        {(() => {
                                            const diffColors = {
                                                normal: { border: 'border-cyan-400', text: 'text-cyan-400', shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]' },
                                                hard: { border: 'border-pink-500', text: 'text-pink-400', shadow: 'shadow-[0_0_15px_rgba(236,72,153,0.4)]' },
                                                cosmic: { border: 'border-violet-500', text: 'text-violet-400', shadow: 'shadow-[0_0_15px_rgba(139,92,246,0.5)]' }
                                            };
                                            const currentColors = diffColors[selectedDifficulty] || diffColors.normal;
                                            return (
                                        <div 
                                            className={`relative bg-slate-800 rounded-xl border ${currentColors.border} overflow-hidden ${currentColors.shadow} select-none touch-pan-y transition-all duration-300`}
                                            onTouchStart={(e) => {
                                                touchStartX.current = e.changedTouches[0].screenX;
                                            }}
                                            onTouchEnd={(e) => {
                                                if (touchStartX.current === null) return;
                                                const touchEndX = e.changedTouches[0].screenX;
                                                const diff = touchStartX.current - touchEndX;
                                                if (diff > 50) {
                                                    const idx = DIFFICULTIES.findIndex(d => d.id === selectedDifficulty);
                                                    setSelectedDifficulty(DIFFICULTIES[idx >= DIFFICULTIES.length - 1 ? 0 : idx + 1].id);
                                                    SoundManager.playUIClick();
                                                } else if (diff < -50) {
                                                    const idx = DIFFICULTIES.findIndex(d => d.id === selectedDifficulty);
                                                    setSelectedDifficulty(DIFFICULTIES[idx <= 0 ? DIFFICULTIES.length - 1 : idx - 1].id);
                                                    SoundManager.playUIClick();
                                                }
                                                touchStartX.current = null;
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                                            
                                            <div className="relative flex items-center justify-between p-4 min-h-[120px]">
                                                <button 
                                                    onClick={() => {
                                                        const idx = DIFFICULTIES.findIndex(d => d.id === selectedDifficulty);
                                                        const newIdx = idx <= 0 ? DIFFICULTIES.length - 1 : idx - 1;
                                                        setSelectedDifficulty(DIFFICULTIES[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                >
                                                    <ChevronLeft className="w-6 h-6" />
                                                </button>
                                                
                                                <div className="text-center z-10 flex-1 px-4">
                                                    <h4 className={`text-xl md:text-2xl font-bold ${currentColors.text} mb-1 drop-shadow-md transition-colors duration-300`}>
                                                        {DIFFICULTIES.find(d => d.id === selectedDifficulty)?.name}
                                                    </h4>
                                                    <p className="text-sm text-slate-300">
                                                        {DIFFICULTIES.find(d => d.id === selectedDifficulty)?.desc}
                                                    </p>
                                                </div>

                                                <button 
                                                    onClick={() => {
                                                        const idx = DIFFICULTIES.findIndex(d => d.id === selectedDifficulty);
                                                        const newIdx = idx >= DIFFICULTIES.length - 1 ? 0 : idx + 1;
                                                        setSelectedDifficulty(DIFFICULTIES[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                >
                                                    <ChevronRight className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                        );
                                        })()}
                                    </div>
                                </div>

                                {(() => {
                                    const isCharUnlocked = save.unlockedCharacters.includes(selectedChar);
                                    const isArenaUnlocked = (save.unlockedArenasByCharacter[selectedChar] || ['station']).includes(selectedArena);
                                    const canLaunch = isCharUnlocked && isArenaUnlocked;
                                    
                                    return (
                                        <button
                                            onClick={startGame}
                                            disabled={!canLaunch}
                                            className={`w-full mt-6 md:mt-8 text-white text-xl md:text-2xl font-bold py-4 md:py-6 rounded-xl flex items-center justify-center gap-2 md:gap-3 transition-all transform ${
                                                canLaunch
                                                ? 'bg-cyan-600 hover:bg-cyan-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                            }`}
                                        >
                                            {!isCharUnlocked ? (
                                                <>OPERATIVE LOCKED</>
                                            ) : !isArenaUnlocked ? (
                                                <>ARENA LOCKED</>
                                            ) : (
                                                <>LAUNCH MISSION <ArrowRight className="w-6 h-6 md:w-7 md:h-7" /></>
                                            )}
                                        </button>
                                    );
                                })()}
                            </div>
                    </div>
                </div>
            </div>
        </div>
    );
}