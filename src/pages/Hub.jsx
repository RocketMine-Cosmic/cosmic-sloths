import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, ARENAS, DIFFICULTIES, WEAPONS, TRAIL_COSMETICS, SKIN_COSMETICS, getCharacterMastery } from '../game/Constants';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Coins } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import { useOmenXBalance } from '@/hooks/useOmenXBalance';
import { IN_GAME_SKUS } from '@/lib/skuMap';
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';
import BountiesPanel from '../components/game/BountiesPanel';
import { Skull, Crosshair, Zap, Shield, Star } from 'lucide-react';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import CosmeticPreview from '../components/game/CosmeticPreview';
import OmenXAuthButton from '../components/game/OmenXAuthButton';
import { getOmenXUser } from '@/lib/omenxUser';

function getOmenXAuth() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

export default function Hub({ isCarousel }) {
    const navigate = useNavigate();
    const initialSave = SaveManager.load() || {};
    const safeInitialSave = {
        unlockedCharacters: initialSave?.unlockedCharacters ?? ['neobyte'],
        unlockedArenasByCharacter: initialSave?.unlockedArenasByCharacter ?? {},
        unlockedCosmetics: (initialSave?.unlockedCosmetics?.length ?? 0) > 0 ? initialSave.unlockedCosmetics : ['default'],
        cosmetics: initialSave?.cosmetics ?? {},
        gold: initialSave?.gold ?? 0,
        sessionBuffs: initialSave?.sessionBuffs ?? {},
        characterKills: initialSave?.characterKills ?? {},
        foundCharacters: initialSave?.foundCharacters ?? [],
        encounteredEnemies: initialSave?.encounteredEnemies ?? [],
        enemyKills: initialSave?.enemyKills ?? {},
        relicFragments: initialSave?.relicFragments ?? 0,
        cosmicTokens: initialSave?.cosmicTokens ?? 0,
        lastSelectedChar: initialSave?.lastSelectedChar,
        lastSelectedArena: initialSave?.lastSelectedArena,
        lastSelectedDifficulty: initialSave?.lastSelectedDifficulty,
        lastSelectedWeapon: initialSave?.lastSelectedWeapon,
        isNGPlus: initialSave?.isNGPlus ?? false,
        newGamePlusUnlocked: initialSave?.newGamePlusUnlocked,
        hasSetProfileName: initialSave?.hasSetProfileName,
        bounties: initialSave?.bounties,
        maxTimeSurvived: initialSave?.maxTimeSurvived ?? 0,
        totalGoldEarned: initialSave?.totalGoldEarned ?? 0,
        maxLevelReached: initialSave?.maxLevelReached ?? 0,
        totalKills: initialSave?.totalKills ?? 0
    };
    const [save, setSave] = useState(safeInitialSave);
    const [omenxAuth, setOmenxAuth] = useState(null);
    const [pendingLaunch, setPendingLaunch] = useState(null); // 'normal' | 'endless'

    React.useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    React.useEffect(() => {
        setOmenxAuth(getOmenXAuth());
    }, []);

    const [selectedChar, setSelectedChar] = useState(save.lastSelectedChar || 'neobyte');
    const [selectedArena, setSelectedArena] = useState(save.lastSelectedArena || 'station');
    const [selectedDifficulty, setSelectedDifficulty] = useState(save.lastSelectedDifficulty || 'normal');
    const [selectedWeapon, setSelectedWeapon] = useState(save.lastSelectedWeapon || 'neoBlaster');
    const [isNGPlus, setIsNGPlus] = useState(save.isNGPlus || false);
    const [charTab, setCharTab] = useState('loadout');
    const { toast } = useToast();
    const { balance: omenxBalance, refresh: refreshOmenX } = useOmenXBalance();
    const touchStartX = React.useRef(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const getAvailableWeapons = (charId) => {
        return [WEAPONS['neoBlaster']].filter(Boolean);
    };

    const prevCharRef = useRef(selectedChar);

    React.useEffect(() => {
        if (prevCharRef.current !== selectedChar) {
            setSelectedWeapon('neoBlaster');
            prevCharRef.current = selectedChar;
        } else {
            const available = getAvailableWeapons(selectedChar);
            if (!available.find(w => w.id === selectedWeapon)) {
                setSelectedWeapon(available[0]?.id || 'neoBlaster');
            }
        }
    }, [selectedChar, selectedWeapon]);
    
    React.useEffect(() => {
        setSave(prevSave => {
            if (prevSave.lastSelectedChar !== selectedChar || prevSave.lastSelectedArena !== selectedArena || prevSave.lastSelectedDifficulty !== selectedDifficulty || prevSave.lastSelectedWeapon !== selectedWeapon) {
                const newSave = { ...prevSave, lastSelectedChar: selectedChar, lastSelectedArena: selectedArena, lastSelectedDifficulty: selectedDifficulty, lastSelectedWeapon: selectedWeapon };
                SaveManager.save(newSave);
                return newSave;
            }
            return prevSave;
        });
    }, [selectedChar, selectedArena, selectedDifficulty, selectedWeapon]);

    // OmenX-only mode: skip Base44 reward claims

    const checkAndLaunch = async (mode) => {
        SoundManager.playUIClick();
        launchGame(mode);
    };

    const launchGame = (mode) => {
        navigate('/game', { state: { characterId: selectedChar, arenaId: selectedArena, difficultyId: selectedDifficulty, startingWeaponId: selectedWeapon, isNGPlus: isNGPlus, isEndless: mode === 'endless' } });
    };

    const startGame = () => checkAndLaunch('normal');



    // If not logged in with OmenX, show a gate (bypass in preview)
    if (!save) return <div>Loading...</div>;
    if (!omenxAuth && window.self === window.top) {
        return (
            <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 flex flex-col items-center justify-center gap-6 p-6 font-sans`}>
                {!isCarousel && <SpaceBackground />}
                <div className="relative z-10 text-center flex flex-col items-center gap-4">
                    <div className="text-6xl mb-2">🔒</div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-widest uppercase text-white">Login Required</h2>
                    <p className="text-slate-400 text-sm max-w-xs">You need to login with OmenX to access the Sloth Lounge and launch missions.</p>
                    <OmenXAuthButton fullWidth onAuthChange={(data) => setOmenxAuth(data)} />
                </div>
            </div>
        );
    }

    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 p-2 pb-20 md:p-6 font-sans`}>
            {!isCarousel && <SpaceBackground />}
            <div className="max-w-6xl mx-auto relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5 md:gap-4 mb-2 md:mb-6 border-b border-fuchsia-900/40 pb-1.5 md:pb-4">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-xl md:text-4xl font-black tracking-widest uppercase" style={{ background: 'linear-gradient(90deg, #0CA7B8, #D946EF, #0CA7B8)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', dropShadow: '0 0 10px rgba(217,70,239,0.5)' }}>SLOTH LOUNGE</h1>
                        <p className="text-slate-500 mt-0 md:text-sm text-[10px] tracking-widest uppercase hidden md:block">⚡ Rest · Upgrade · Prepare for the Cosmic Void</p>
                    </div>
                    <CurrencyHeader />
                </header>

                <div className="flex flex-col gap-4 md:gap-8">
                    <div className="flex-1 bg-[#0b0416]/60 backdrop-blur-xl rounded-xl md:rounded-2xl p-2 md:p-6 border border-[#D946EF]/30 shadow-[0_0_50px_rgba(217,70,239,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <div className="h-full flex flex-col justify-between">
                                <div>
                                    <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 tracking-widest uppercase flex items-center gap-2"><span className="text-cyan-400">▶</span> Mission Briefing</h2>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-6 mb-2 md:mb-6">
                                        <div>
                                        <h3 className="text-xs md:text-sm text-slate-400 mb-1.5 md:mb-2">Select Operative</h3>
                                        <div 
                                            className="relative bg-[#0b0416]/80 backdrop-blur-xl rounded-lg md:rounded-xl border border-cyan-500/50 hover:border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)] select-none touch-pan-y transition-colors"
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
                                                const isUnlocked = (save?.unlockedCharacters ?? []).includes(char?.id);
                                                const canAfford = save.gold >= char.cost;
                                                const isFindable = ['glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte'].includes(char.id);
                                                
                                                return (
                                                    <>
                                                        <div 
                                                            className="absolute inset-0 opacity-80 bg-contain bg-no-repeat transition-all duration-500"
                                                            style={{ 
                                                                backgroundImage: char.image ? `url(${char.image})` : 'none', 
                                                                backgroundPosition: '85% center',
                                                                filter: `drop-shadow(0 0 10px ${SKIN_COSMETICS.find(s => s.id === (save.cosmetics?.skins?.[char.id] || `${char.id}_default`))?.color || char.color})`
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0416] via-[#0b0416]/90 to-transparent pointer-events-none" />
                                                        
                                                        <div className="relative flex items-center justify-between p-1.5 md:p-4 min-h-[70px] md:min-h-[140px]">
                                                            <button 
                                                                onClick={() => {
                                                                    const idx = CHARACTERS.findIndex(c => c.id === selectedChar);
                                                                    const newIdx = idx <= 0 ? CHARACTERS.length - 1 : idx - 1;
                                                                    setSelectedChar(CHARACTERS[newIdx].id);
                                                                    SoundManager.playUIClick();
                                                                }}
                                                                className="p-1.5 md:p-2 bg-[#0b0416]/80 border border-cyan-500/30 rounded-full hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-100 transition-all z-10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                                            >
                                                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                                            </button>
                                                            
                                                            <div className="text-left z-10 flex-1 px-2 md:px-4 flex flex-col items-start">
                                                                {(() => {
                                                                    const charKills = save.characterKills?.[char.id] || 0;
                                                                    const mastery = getCharacterMastery(charKills);
                                                                    return (
                                                                        <>
                                                                            <h4 className="text-lg md:text-xl font-bold mb-0.5 flex flex-wrap items-center gap-2" style={{ color: char.color, textShadow: `0 0 10px ${char.color}80` }}>
                                                                                {char.name}
                                                                                <span className="text-xs bg-slate-900/80 px-2 py-1 rounded-full border border-slate-700 font-mono tracking-normal flex items-center gap-1" style={{ textShadow: 'none', color: '#fff' }} title={mastery.current.bonusDesc !== 'None' ? `Mastery Bonus: ${mastery.current.bonusDesc}` : 'No Mastery Bonus'}>
                                                                                    {mastery.current.badge} {mastery.current.title}
                                                                                </span>
                                                                            </h4>
                                                                            <div className="text-[10px] text-slate-400 mb-1.5 font-mono">
                                                                                Kills: <span className="text-white">{charKills.toLocaleString()}</span> {mastery.next ? <span className="text-slate-500">/ {mastery.next.killsRequired.toLocaleString()} for {mastery.next.title} ({mastery.next.bonusDesc})</span> : <span className="text-yellow-400">(MAX)</span>}
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                                <div className="flex gap-2 mb-2 w-full pr-4 relative z-20">
                                                                    <button onClick={(e) => { e.stopPropagation(); setCharTab('loadout'); SoundManager.playUIClick(); }} className={`text-[10px] font-bold px-3 py-1.5 rounded border transition-colors ${charTab === 'loadout' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>LOADOUT</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setCharTab('cosmetics'); SoundManager.playUIClick(); }} className={`text-[10px] font-bold px-3 py-1.5 rounded border transition-colors ${charTab === 'cosmetics' ? 'bg-pink-500/20 text-pink-300 border-pink-500/50' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>COSMETICS</button>
                                                                </div>
                                                                {charTab === 'loadout' ? (
                                                                    <>
                                                                        <p className="text-[10px] md:text-xs text-slate-300 mb-1 max-w-[80%] leading-tight">
                                                                            {char.desc}
                                                                        </p>
                                                                        <div className="flex gap-1.5 md:gap-2 text-[9px] md:text-[10px] mb-1 bg-[#0b0416]/80 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-cyan-500/30 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]">
                                                                            <span className="text-slate-300">HP: <span className={char.hp > CHARACTERS[0].hp ? 'text-green-400 font-bold' : char.hp < CHARACTERS[0].hp ? 'text-red-400 font-bold' : 'text-white'}>{char.hp}{char.hp > CHARACTERS[0].hp ? '↑' : char.hp < CHARACTERS[0].hp ? '↓' : ''}</span></span>
                                                                            <span className="text-slate-300">SPD: <span className={char.speed > CHARACTERS[0].speed ? 'text-green-400 font-bold' : char.speed < CHARACTERS[0].speed ? 'text-red-400 font-bold' : 'text-white'}>{char.speed}{char.speed > CHARACTERS[0].speed ? '↑' : char.speed < CHARACTERS[0].speed ? '↓' : ''}</span></span>
                                                                            <span className="text-slate-300">ARM: <span className={char.armor > CHARACTERS[0].armor ? 'text-green-400 font-bold' : char.armor < CHARACTERS[0].armor ? 'text-red-400 font-bold' : 'text-white'}>{char.armor}{char.armor > CHARACTERS[0].armor ? '↑' : char.armor < CHARACTERS[0].armor ? '↓' : ''}</span></span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="w-full pr-4 flex flex-col gap-2 relative z-50">
                                                                        <div className="h-[60px] md:h-[80px] w-full rounded-md overflow-hidden border border-pink-500/30 shrink-0 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                                                                            <CosmeticPreview 
                                                                                trailId={save.cosmetics?.trail || 'default'} 
                                                                                killEffectId={save.cosmetics?.killEffect || 'none'}
                                                                                playerColor={SKIN_COSMETICS.find(s => s.id === (save.cosmetics?.skins?.[char.id] || `${char.id}_default`))?.color || char.color}
                                                                                charId={char.id}
                                                                            />
                                                                        </div>
                                                                        <select
                                                                            value={save.cosmetics?.skins?.[char.id] || `${char.id}_default`}
                                                                            onChange={(e) => {
                                                                                SoundManager.playUIClick();
                                                                                const newSave = { ...save, cosmetics: { ...save.cosmetics, skins: { ...(save.cosmetics?.skins || {}), [char.id]: e.target.value } } };
                                                                                SaveManager.save(newSave);
                                                                                setSave(newSave);
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-full bg-[#0b0416]/90 text-white text-xs border border-pink-500/50 rounded p-1 outline-none focus:border-pink-400"
                                                                        >
                                                                            <option disabled>-- Select Skin --</option>
                                                                            {SKIN_COSMETICS.filter(s => s.charId === char.id).map(s => {
                                                                                                                 const unlockedSkins = save?.unlockedCosmetics ?? ['default'];
                                                                                                                 const isOwned = s.goldCost === 0 || (Array.isArray(unlockedSkins) && unlockedSkins.includes(s.id));
                                                                                if (!isOwned) return null;
                                                                                return <option key={s.id} value={s.id}>{s.icon} {s.name}</option>;
                                                                            })}
                                                                        </select>
                                                                        
                                                                        <select
                                                                            value={save.cosmetics?.trail || 'default'}
                                                                            onChange={(e) => {
                                                                                SoundManager.playUIClick();
                                                                                const newSave = { ...save, cosmetics: { ...save.cosmetics, trail: e.target.value } };
                                                                                SaveManager.save(newSave);
                                                                                setSave(newSave);
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-full bg-[#0b0416]/90 text-white text-xs border border-pink-500/50 rounded p-1 outline-none focus:border-pink-400"
                                                                        >
                                                                            <option disabled>-- Select Trail --</option>
                                                                            {TRAIL_COSMETICS.map(t => {
                                                                                 const unlockedTrails = save?.unlockedCosmetics ?? ['default'];
                                                                                 const isOwned = Array.isArray(unlockedTrails) && unlockedTrails.includes(t.id);
                                                                                if (!isOwned) return null;
                                                                                return <option key={t.id} value={t.id}>{t.icon} {t.name}</option>;
                                                                            })}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                                
                                                                {!isUnlocked && (
                                                                    <div className="px-3 py-1 rounded font-bold text-xs bg-[#0b0416]/50 text-slate-400 border border-slate-700/50 mt-1 inline-flex items-center gap-1.5 w-fit">
                                                                        🔍 Find in Maps
                                                                    </div>
                                                                )}
                                                                {isUnlocked && (
                                                                    <span className="inline-flex items-center gap-1 text-cyan-300 font-black tracking-widest text-[10px] bg-cyan-950/60 px-2 py-1 rounded border border-cyan-500/50 backdrop-blur-sm mt-1 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
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
                                        <h3 className="text-xs md:text-sm text-slate-400 mb-1.5 md:mb-2">Select Sector</h3>
                                        <div 
                                            className="relative bg-[#0b0416]/80 backdrop-blur-xl rounded-lg md:rounded-xl border border-cyan-500/50 hover:border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)] select-none touch-pan-y transition-colors"
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
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0416] via-[#0b0416]/70 to-transparent pointer-events-none" />
                                            
                                            <div className="relative flex items-center justify-between p-1.5 md:p-4 min-h-[60px] md:min-h-[120px]">
                                                <button 
                                                    onClick={() => {
                                                        const idx = ARENAS.findIndex(a => a.id === selectedArena);
                                                        const newIdx = idx <= 0 ? ARENAS.length - 1 : idx - 1;
                                                        setSelectedArena(ARENAS[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-1.5 md:p-2 bg-[#0b0416]/80 border border-cyan-500/30 rounded-full hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-100 transition-all z-10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                                >
                                                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                                </button>
                                                
                                                <div className="text-center z-10 flex-1 px-2 md:px-4">
                                                    <h4 className="text-lg md:text-xl font-bold text-white mb-0.5 md:mb-1 drop-shadow-md">
                                                        {ARENAS.find(a => a.id === selectedArena)?.name}
                                                    </h4>
                                                    {!((save?.unlockedArenasByCharacter?.[selectedChar] || ['station']).includes(selectedArena)) ? (
                                                        <span className="inline-flex items-center gap-1 text-rose-300 font-black tracking-widest text-[9px] md:text-[10px] bg-rose-950/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-rose-500/50 backdrop-blur-sm shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                                                            🔒 LOCKED
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="inline-flex items-center gap-1 text-cyan-300 font-black tracking-widest text-[9px] md:text-[10px] bg-cyan-950/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-cyan-500/50 backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                                                ✓ UNLOCKED
                                                            </span>
                                                            {(() => {
                                                                const currentIndex = ARENAS.findIndex(a => a.id === selectedArena);
                                                                const unlockedCount = (save?.unlockedArenasByCharacter?.[selectedChar] || ['station']).length;
                                                                const diff = Math.max(0, unlockedCount - 1 - currentIndex);
                                                                const penalty = diff * 10;
                                                                if (penalty > 0) {
                                                                    return <span className="text-[9px] text-yellow-500 font-bold tracking-wider uppercase">-{Math.min(50, penalty)}% Gold Penalty</span>;
                                                                }
                                                                return null;
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                <button 
                                                    onClick={() => {
                                                        const idx = ARENAS.findIndex(a => a.id === selectedArena);
                                                        const newIdx = idx >= ARENAS.length - 1 ? 0 : idx + 1;
                                                        setSelectedArena(ARENAS[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-1.5 md:p-2 bg-[#0b0416]/80 border border-cyan-500/30 rounded-full hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-100 transition-all z-10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                                >
                                                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                                                </button>
                                            </div>
                                        </div>
                                        </div>

                                        <div>
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
                                            className={`relative bg-[#0b0416]/80 backdrop-blur-xl rounded-lg md:rounded-xl border ${currentColors.border} overflow-hidden ${currentColors.shadow} select-none touch-pan-y transition-all duration-300`}
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
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0416] via-[#0b0416]/70 to-transparent pointer-events-none" />
                                            
                                            <div className="relative flex items-center justify-between p-1.5 md:p-4 min-h-[60px] md:min-h-[120px]">
                                                <button 
                                                    onClick={() => {
                                                        const idx = DIFFICULTIES.findIndex(d => d.id === selectedDifficulty);
                                                        const newIdx = idx <= 0 ? DIFFICULTIES.length - 1 : idx - 1;
                                                        setSelectedDifficulty(DIFFICULTIES[newIdx].id);
                                                        SoundManager.playUIClick();
                                                    }}
                                                    className="p-1.5 md:p-2 bg-[#0b0416]/80 border border-cyan-500/30 rounded-full hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-100 transition-all z-10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
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
                                                    className="p-1.5 md:p-2 bg-[#0b0416]/80 border border-cyan-500/30 rounded-full hover:border-cyan-400 hover:bg-cyan-500/20 text-cyan-100 transition-all z-10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                                >
                                                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                                                </button>
                                            </div>
                                        </div>
                                        );
                                        })()}
                                        {save.newGamePlusUnlocked && (
                                            <div className="mt-3 flex items-center justify-center gap-2 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                                                <input 
                                                    type="checkbox" 
                                                    id="ngplus" 
                                                    checked={isNGPlus} 
                                                    onChange={(e) => {
                                                        SoundManager.playUIClick();
                                                        setIsNGPlus(e.target.checked);
                                                        const newSave = { ...save, isNGPlus: e.target.checked };
                                                        SaveManager.save(newSave);
                                                        setSave(newSave);
                                                    }} 
                                                    className="w-4 h-4 accent-red-500 cursor-pointer" 
                                                />
                                                <label htmlFor="ngplus" className="text-xs md:text-sm font-bold text-red-400 uppercase tracking-widest cursor-pointer drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                                                    Activate New Game+
                                                </label>
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                </div>

                                {(() => {
                                    const isCharUnlocked = (save?.unlockedCharacters ?? []).includes(selectedChar);
                                    const isArenaUnlocked = (save?.unlockedArenasByCharacter?.[selectedChar] || ['station']).includes(selectedArena);
                                    const canLaunch = isCharUnlocked && isArenaUnlocked;
                                    
                                    const sessionBuffs = save.sessionBuffs || {};
                                    const hasXpBuff = sessionBuffs.xpExpiry > currentTime;
                                    
                                    const formatTimeLeft = (ms) => {
                                        const totalSeconds = Math.floor(ms / 1000);
                                        const mins = Math.floor(totalSeconds / 60);
                                        const secs = totalSeconds % 60;
                                        return `${mins}:${secs.toString().padStart(2, '0')}`;
                                    };
                                    
                                    const timeLeft = hasXpBuff ? formatTimeLeft(sessionBuffs.xpExpiry - currentTime) : '';
                                    
                                    const buyBuff = async () => {
                                        if ((omenxBalance ?? 0) < 10) return;
                                        SoundManager.playUIClick();
                                        const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
                                        const week_id = moment().format('YYYY-[W]ww');
                                        const seasonNum = Math.floor(moment().week() / 4) + 1;
                                        const season_id = `${moment().format('YYYY')}-S${seasonNum}`;
                                        const res = await base44.functions.invoke('purchaseSku', { skuId: IN_GAME_SKUS.xpSession, quantity: 1, walletAddress: authData?.walletAddress, week_id, season_id, amount: 10 });
                                        if (!res.data?.success) { toast({ title: 'Purchase Failed', description: res.data?.error || 'Try again.' }); return; }
                                        refreshOmenX();
                                        const newSave = { ...SaveManager.load() };
                                        newSave.sessionBuffs = newSave.sessionBuffs || {};
                                        newSave.sessionBuffs.xpExpiry = currentTime + 60 * 60 * 1000;
                                        SaveManager.save(newSave);
                                        setSave(newSave);
                                        toast({ title: "Buff Activated", description: `+50% XP for 60 minutes!` });
                                    };
                                    
                                    return (
                                        <div className="flex flex-col gap-4 mt-2 md:mt-8 pt-2 md:pt-6 border-t border-slate-700/40">
                                            
                                            <div className="flex flex-col sm:flex-row gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                                <div className="text-xs text-slate-400 font-bold mb-1 sm:mb-0 sm:w-24 shrink-0 flex items-center">SESSION BUFFS</div>
                                                <button onClick={buyBuff} disabled={hasXpBuff || (omenxBalance ?? 0) < 10} className={`flex-1 flex justify-between items-center px-3 py-2 rounded text-xs font-bold border transition-all ${hasXpBuff ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed'}`}>
                                                    <span className="flex items-center gap-2">✨ +50% XP {hasXpBuff ? `(ACTIVE: ${timeLeft})` : '(60 Mins)'}</span>
                                                    {!hasXpBuff && <span className="text-purple-400 font-bold">10 OMENX</span>}
                                                </button>
                                            </div>

                                            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                                            <button
                                                onClick={() => canLaunch && checkAndLaunch('normal')}
                                                disabled={!canLaunch}
                                                className={`flex-1 text-white text-sm md:text-xl font-black py-2 md:py-4 rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all transform tracking-widest uppercase ${
                                                    canLaunch
                                                    ? 'bg-gradient-to-r from-[#0CA7B8] to-cyan-400 hover:from-cyan-400 hover:to-[#0CA7B8] hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(12,167,184,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]'
                                                    : 'bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/50'
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
                                                onClick={() => canLaunch && checkAndLaunch('endless')}
                                                disabled={!canLaunch}
                                                className={`flex-1 text-white text-sm md:text-xl font-black py-2 md:py-4 rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all transform tracking-widest uppercase ${
                                                    canLaunch
                                                    ? 'bg-gradient-to-r from-[#D946EF] to-fuchsia-400 hover:from-fuchsia-400 hover:to-[#D946EF] hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(217,70,239,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]'
                                                    : 'bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/50'
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
                                        </div>
                                    );
                                })()}
                            </div>
                    </div>

                </div>
            </div>
        </div>
    );
}