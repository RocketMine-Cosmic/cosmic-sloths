import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, ARENAS, DIFFICULTIES } from '../game/Constants';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';
import BountiesPanel from '../components/game/BountiesPanel';
import { Skull, Crosshair } from 'lucide-react';

export default function Hub({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const [selectedChar, setSelectedChar] = useState(save.lastSelectedChar || 'neobyte');
    const [selectedArena, setSelectedArena] = useState(save.lastSelectedArena || 'station');
    const [selectedDifficulty, setSelectedDifficulty] = useState(save.lastSelectedDifficulty || 'normal');
    const { toast } = useToast();
    const touchStartX = React.useRef(null);
    
    const [worldBossData, setWorldBossData] = useState(null);
    const [worldBossContribution, setWorldBossContribution] = useState(null);
    const [claimingReward, setClaimingReward] = useState(false);

    React.useEffect(() => {
        setSave(prevSave => {
            if (prevSave.lastSelectedChar !== selectedChar || prevSave.lastSelectedArena !== selectedArena || prevSave.lastSelectedDifficulty !== selectedDifficulty) {
                const newSave = { ...prevSave, lastSelectedChar: selectedChar, lastSelectedArena: selectedArena, lastSelectedDifficulty: selectedDifficulty };
                SaveManager.save(newSave);
                return newSave;
            }
            return prevSave;
        });
    }, [selectedChar, selectedArena, selectedDifficulty]);

    React.useEffect(() => {
        const fetchBoss = async () => {
            try {
                const user = await base44.auth.me();
                if (!user) return;
                const week_id = moment().format('YYYY-[W]ww');
                const res = await base44.functions.invoke('getOrSpawnWeeklyBoss', { week_id });
                if (res.data.boss) {
                    setWorldBossData(res.data.boss);
                    const contribs = await base44.entities.GlobalBossContribution.filter({ week_id, user_id: user.id });
                    if (contribs.length > 0) setWorldBossContribution(contribs[0]);
                }
            } catch (e) { console.error('Failed to fetch world boss', e); }
        };
        fetchBoss();

        const claimRewards = async () => {
            try {
                const user = await base44.auth.me();
                if (!user) return;
                const displayName = user.player_name || user.data?.player_name || user.data?.full_name || user.full_name;
                const pending = await base44.entities.PendingReward.filter({ player_name: displayName, claimed: false });
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

    const handleClaimBossReward = async () => {
        if (!worldBossData || claimingReward) return;
        setClaimingReward(true);
        try {
            const week_id = moment().format('YYYY-[W]ww');
            const res = await base44.functions.invoke('claimBossReward', { week_id });
            if (res.data.status === 'success') {
                const { type, id } = res.data.reward;
                const save = SaveManager.load();
                if (!save.cosmetics) save.cosmetics = { skins: {}, trail: 'default', killEffect: 'none', unlocked: { trails: [], killEffects: [] } };
                if (!save.cosmetics.unlocked) save.cosmetics.unlocked = { trails: [], killEffects: [] };
                
                if (type === 'trail') {
                    if (!save.cosmetics.unlocked.trails.includes(id)) save.cosmetics.unlocked.trails.push(id);
                } else if (type === 'kill_effect') {
                    if (!save.cosmetics.unlocked.killEffects.includes(id)) save.cosmetics.unlocked.killEffects.push(id);
                }
                SaveManager.save(save);
                setWorldBossContribution(prev => ({ ...prev, claimed: true }));
                toast({ title: 'Reward Claimed!', description: `Unlocked limited cosmetic: ${id}` });
                SoundManager.playLevelUp();
            } else {
                toast({ title: 'Error', description: res.data.error || 'Failed to claim reward' });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to claim reward' });
        }
        setClaimingReward(false);
    };



    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} bg-slate-950 text-slate-200 p-2 pb-20 md:p-6 font-mono`}>
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-slate-800 pb-2 md:pb-4">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 tracking-tight">SLOTH LOUNGE</h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs">Rest, upgrade, and prepare for the cosmic void.</p>
                    </div>
                    <div className="flex gap-1.5 md:gap-4">
                        <div className="text-sm md:text-lg font-bold text-purple-400 bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 shadow-lg" title="Reroll Tokens">
                            🎲 {save.rerollTokens || 0}
                        </div>
                        <div className="text-sm md:text-lg font-bold text-emerald-400 bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 shadow-lg" title="Cosmic Tokens (Crypto)">
                            💠 {save.cosmicTokens || 0}
                        </div>
                        <div className="text-sm md:text-lg font-bold text-yellow-400 bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 shadow-lg" title="Gold">
                            🪙 {save.gold}
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-4 md:gap-8">
                    <div className="flex-1 bg-slate-900 rounded-xl md:rounded-2xl p-3 md:p-6 border border-slate-800 min-h-[400px] md:min-h-[600px]">
                        <div className="h-full flex flex-col justify-between">
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">Mission Briefing</h2>
                                    
                                    <div className="mb-4 md:mb-6">
                                        <h3 className="text-xs md:text-sm text-slate-400 mb-1.5 md:mb-2">Select Operative</h3>
                                        <div 
                                            className="relative bg-slate-800 rounded-lg md:rounded-xl border border-cyan-500 overflow-hidden shadow-[0_0_10px_rgba(6,182,212,0.3)] select-none touch-pan-y"
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
                                                        
                                                        <div className="relative flex items-center justify-between p-2 md:p-4 min-h-[100px] md:min-h-[140px]">
                                                            <button 
                                                                onClick={() => {
                                                                    const idx = CHARACTERS.findIndex(c => c.id === selectedChar);
                                                                    const newIdx = idx <= 0 ? CHARACTERS.length - 1 : idx - 1;
                                                                    setSelectedChar(CHARACTERS[newIdx].id);
                                                                    SoundManager.playUIClick();
                                                                }}
                                                                className="p-1.5 md:p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                            >
                                                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                                            </button>
                                                            
                                                            <div className="text-left z-10 flex-1 px-2 md:px-4 flex flex-col items-start">
                                                                <h4 className="text-lg md:text-xl font-bold text-white mb-0.5 drop-shadow-md" style={{ color: char.color }}>
                                                                    {char.name}
                                                                </h4>
                                                                <p className="text-[10px] md:text-xs text-slate-300 mb-1 max-w-[80%] leading-tight">
                                                                    {char.desc}
                                                                </p>
                                                                <div className="flex gap-1.5 md:gap-2 text-[9px] md:text-[10px] mb-1 bg-slate-900/80 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-slate-700/50">
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
                                        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                                            <h3 className="text-sm md:text-base font-bold text-cyan-400 uppercase tracking-wider">Inner Galaxy</h3>
                                            <span className="text-xs md:text-sm text-slate-400">- Select Sector</span>
                                        </div>
                                        <div 
                                            className="relative bg-slate-800 rounded-lg md:rounded-xl border border-cyan-500 overflow-hidden shadow-[0_0_10px_rgba(6,182,212,0.3)] select-none touch-pan-y"
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
                                            
                                            <div className="relative flex items-center justify-between p-2 md:p-4 min-h-[80px] md:min-h-[120px]">
                                                <button 
                                                    onClick={() => {
                                                        const idx = ARENAS.findIndex(a => a.id === selectedArena);
                                                        const newIdx = idx <= 0 ? ARENAS.length - 1 : idx - 1;
                                                        setSelectedArena(ARENAS[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-1.5 md:p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                >
                                                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                                </button>
                                                
                                                <div className="text-center z-10 flex-1 px-2 md:px-4">
                                                    <h4 className="text-lg md:text-xl font-bold text-white mb-0.5 md:mb-1 drop-shadow-md">
                                                        {ARENAS.find(a => a.id === selectedArena)?.name}
                                                    </h4>
                                                    {!(save.unlockedArenasByCharacter[selectedChar] || ['station']).includes(selectedArena) ? (
                                                        <span className="inline-flex items-center gap-1 text-red-400 font-bold text-[10px] md:text-xs bg-red-900/80 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-red-500/50 backdrop-blur-sm">
                                                            🔒 LOCKED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-cyan-400 font-bold text-[10px] md:text-xs bg-slate-900/80 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-cyan-500/50 backdrop-blur-sm">
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
                                                    className="p-1.5 md:p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                >
                                                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 md:mt-6">
                                        <h3 className="text-xs md:text-sm text-slate-400 mb-1.5 md:mb-2">Cosmic Difficulty</h3>
                                        {(() => {
                                            const diffColors = {
                                                normal: { border: 'border-cyan-400', text: 'text-cyan-400', shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]' },
                                                hard: { border: 'border-pink-500', text: 'text-pink-400', shadow: 'shadow-[0_0_15px_rgba(236,72,153,0.4)]' },
                                                cosmic: { border: 'border-violet-500', text: 'text-violet-400', shadow: 'shadow-[0_0_15px_rgba(139,92,246,0.5)]' }
                                            };
                                            const currentColors = diffColors[selectedDifficulty] || diffColors.normal;
                                            return (
                                        <div 
                                            className={`relative bg-slate-800 rounded-lg md:rounded-xl border ${currentColors.border} overflow-hidden ${currentColors.shadow} select-none touch-pan-y transition-all duration-300`}
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
                                            
                                            <div className="relative flex items-center justify-between p-2 md:p-4 min-h-[80px] md:min-h-[120px]">
                                                <button 
                                                    onClick={() => {
                                                        const idx = DIFFICULTIES.findIndex(d => d.id === selectedDifficulty);
                                                        const newIdx = idx <= 0 ? DIFFICULTIES.length - 1 : idx - 1;
                                                        setSelectedDifficulty(DIFFICULTIES[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-1.5 md:p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                >
                                                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                                </button>
                                                
                                                <div className="text-center z-10 flex-1 px-2 md:px-4">
                                                    <h4 className={`text-lg md:text-xl font-bold ${currentColors.text} mb-0.5 md:mb-1 drop-shadow-md transition-colors duration-300`}>
                                                        {DIFFICULTIES.find(d => d.id === selectedDifficulty)?.name}
                                                    </h4>
                                                    <p className="text-[10px] md:text-xs text-slate-300">
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
                                                    className="p-1.5 md:p-2 bg-slate-900/80 rounded-full hover:bg-slate-700 text-white transition-colors z-10"
                                                >
                                                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
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
                                        <div className="flex flex-col gap-2 mt-4 md:mt-6">
                                            <button
                                                onClick={startGame}
                                                disabled={!canLaunch}
                                                className={`w-full text-white text-lg md:text-xl font-bold py-3 md:py-4 rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all transform ${
                                                    canLaunch
                                                    ? 'bg-cyan-600 hover:bg-cyan-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                                                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                }`}
                                            >
                                                {!isCharUnlocked ? (
                                                    <>OPERATIVE LOCKED</>
                                                ) : !isArenaUnlocked ? (
                                                    <>SECTOR LOCKED</>
                                                ) : (
                                                    <>LAUNCH MISSION <ArrowRight className="w-5 h-5 md:w-6 md:h-6" /></>
                                                )}
                                            </button>
                                            
                                            <button
                                                onClick={() => {
                                                    SoundManager.playUIClick();
                                                    navigate('/game', { state: { characterId: selectedChar, arenaId: selectedArena, difficultyId: selectedDifficulty, isEndless: true } });
                                                }}
                                                disabled={!canLaunch}
                                                className={`w-full text-white text-lg md:text-xl font-bold py-3 md:py-4 rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all transform ${
                                                    canLaunch
                                                    ? 'bg-purple-600 hover:bg-purple-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                                                }`}
                                            >
                                                {!isCharUnlocked ? (
                                                    <>OPERATIVE LOCKED</>
                                                ) : !isArenaUnlocked ? (
                                                    <>SECTOR LOCKED</>
                                                ) : (
                                                    <>LAUNCH ENDLESS MODE <ArrowRight className="w-5 h-5 md:w-6 md:h-6" /></>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                    </div>

                    <div className="bg-slate-900 border border-red-900/50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden mt-4 md:mt-0">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
                        <h3 className="text-xl md:text-2xl font-bold text-red-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                            <Skull className="w-5 h-5 md:w-6 md:h-6" /> GLOBAL RAID EVENT
                        </h3>
                        <p className="text-slate-400 text-xs md:text-sm mb-4 max-w-2xl">
                            Join forces with all players globally to defeat the weekly World Boss. If the community drains its health before the week ends, everyone who contributed damage earns a rare cosmetic reward!
                        </p>
                        
                        {worldBossData ? (
                            <div className="bg-slate-950 p-4 md:p-6 rounded-xl border border-red-900 mb-4 relative overflow-hidden">
                                <div className="absolute right-0 top-0 opacity-10 text-7xl md:text-9xl transform translate-x-1/4 -translate-y-1/4">👹</div>
                                <div className="relative z-10">
                                    <h4 className="text-lg md:text-xl font-bold text-white mb-1">{worldBossData.name}</h4>
                                    <div className="text-red-400 text-xs md:text-sm mb-3 font-mono">
                                        HP: {worldBossData.current_hp.toLocaleString()} / {worldBossData.max_hp.toLocaleString()}
                                    </div>
                                    
                                    <div className="w-full bg-slate-800 h-3 md:h-4 rounded-full overflow-hidden mb-4 border border-slate-700">
                                        <div 
                                            className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-1000"
                                            style={{ width: `${Math.max(0, (worldBossData.current_hp / worldBossData.max_hp) * 100)}%` }}
                                        ></div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs md:text-sm gap-3">
                                        <span className="text-slate-400">
                                            Your Contribution: <span className="text-yellow-400 font-mono font-bold">{(worldBossContribution?.damage || 0).toLocaleString()}</span>
                                        </span>
                                        
                                        {worldBossData.is_defeated ? (
                                            worldBossContribution ? (
                                                worldBossContribution.claimed ? (
                                                    <span className="text-emerald-500 font-bold bg-emerald-950/30 px-3 py-1.5 rounded">Reward Claimed ✓</span>
                                                ) : (
                                                    <button 
                                                        onClick={handleClaimBossReward}
                                                        disabled={claimingReward}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors animate-pulse"
                                                    >
                                                        {claimingReward ? 'Claiming...' : 'Claim Reward!'}
                                                    </button>
                                                )
                                            ) : (
                                                <span className="text-slate-500 italic">You didn't participate this week.</span>
                                            )
                                        ) : (
                                            <span className="text-red-400 font-bold animate-pulse">BOSS IS ACTIVE</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center p-6 md:p-8">
                                <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        
                        <button
                            onClick={() => { SoundManager.playGameStart(); navigate('/game', { state: { characterId: selectedChar, arenaId: 'world_boss_arena', difficultyId: 'normal', isEndless: true } }); }}
                            disabled={worldBossData?.is_defeated || !save.unlockedCharacters.includes(selectedChar)}
                            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2"
                        >
                            <Crosshair className="w-4 h-4 md:w-5 md:h-5" />
                            {worldBossData?.is_defeated ? 'Boss Defeated' : 'Launch Raid'}
                        </button>
                    </div>
                    

                </div>
            </div>
        </div>
    );
}