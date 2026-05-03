import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CharacterUnlockManager } from '../game/CharacterUnlocks';
import { CHARACTERS, ARENAS, DIFFICULTIES, WEAPONS, TRAIL_COSMETICS, SKIN_COSMETICS, getCharacterMastery } from '../game/Constants';
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Coins } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import { useCurrency } from '@/lib/CurrencyContext';
import { IN_GAME_SKUS } from '@/lib/skuMap';
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';
import BountiesPanel from '../components/game/BountiesPanel';
import BuildSummary from '../components/game/BuildSummary';
import { Skull, Crosshair, Zap, Shield, Star } from 'lucide-react';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import CosmeticPreview from '../components/game/CosmeticPreview';
import OmenXAuthButton from '../components/game/OmenXAuthButton';
import OmenXGate from '../components/game/OmenXGate';
import OmenXConfirmation from '../components/game/OmenXConfirmation';
import { useOmenXUser } from '@/hooks/useOmenXUser';
import { useOmenXVip } from '@/hooks/useOmenXVip';
import { useOmenXConfirmation } from '@/hooks/useOmenXConfirmation';

import { subscribePlayerData, ensureNftsFetched, refreshBalance } from '@/lib/playerDataCache';

function getOmenXAuth() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

export default function Hub({ isCarousel }) {
    const navigate = useNavigate();
    const initialSave = SaveManager.load() || {};
    const safeInitialSave = {
        unlockedCharacters: (initialSave?.unlockedCharacters ?? []).length > 0 ? initialSave.unlockedCharacters : ['neobyte'],
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
    const [syncReady, setSyncReady] = useState(false);
    // Once we've applied the cloud-saved character/arena/difficulty/weapon to local
    // state ONCE, we never re-sync those fields from external save updates again —
    // otherwise every background save (including the user's own picks being written
    // back) would clobber the active selection.
    const initialSelectionApplied = React.useRef(false);
    const { vip: vipLevel } = useOmenXVip();
    const { nfts } = useCurrency();

    // Track timestamps of saves WE wrote, so we can ignore the saveUpdated echo
    // they trigger (otherwise every character cycle causes a re-render flicker).
    const ownSaveTimestamps = React.useRef(new Set());

    React.useEffect(() => {
        const handleSaveUpdated = (e) => {
            if (!syncReady) return;
            const incoming = e.detail || {};
            // Ignore our own saves echoing back through the event bus.
            if (incoming.updated_at && ownSaveTimestamps.current.has(incoming.updated_at)) {
                ownSaveTimestamps.current.delete(incoming.updated_at);
                return;
            }
            setSave(prev => ({
                ...incoming,
                // Preserve the user's live selection — owned by local state.
                lastSelectedChar: prev.lastSelectedChar,
                lastSelectedArena: prev.lastSelectedArena,
                lastSelectedDifficulty: prev.lastSelectedDifficulty,
                lastSelectedWeapon: prev.lastSelectedWeapon,
            }));
        };
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, [syncReady]);

    // Compute NFT-unlocked characters for UI only (do NOT persist via SaveManager —
    // syncSave is server-authoritative and blocks client-side unlockedCharacters writes).
    // The cloud already grants NFT unlocks via its own logic; this just makes them
    // visible immediately in the UI without waiting for the next cloud sync round-trip.
    const nftUnlockedChars = React.useMemo(() => {
        return (nfts || [])
            .map(nft => nft.metadata?.name?.toLowerCase())
            .filter(charId => charId && CHARACTERS.find(c => c.id === charId));
    }, [nfts]);

    // Merge save's cloud-authoritative unlockedCharacters with NFT unlocks (UI only).
    const effectiveUnlockedCharacters = React.useMemo(() => {
        return [...new Set([...(save.unlockedCharacters || []), ...nftUnlockedChars])];
    }, [save.unlockedCharacters, nftUnlockedChars]);

    const { user: omenxUser } = useOmenXUser();

    React.useEffect(() => {
         let isMounted = true;
         const initOmenX = async () => {
             const auth = getOmenXAuth();
             if (!isMounted) return;
             setOmenxAuth(auth);

             if (auth?.walletAddress) {
                 try {
                     await SaveManager.initialize();
                     if (!isMounted) return;

                     // Load merged save (initialize() has completed by now)
                     const mergedSave = SaveManager.load();
                     if (!isMounted) return;

                     // Use centralized cache for player data (deduped)
                     subscribePlayerData(() => {});
                     // Trigger NFT fetch if not already cached — required to unlock NFT characters
                     ensureNftsFetched();

                     setSave(mergedSave);

                     // VIP level is now fetched via useOmenXVip hook globally
                    if (vipLevel > 0 && isMounted) {
                        const s = SaveManager.load();
                        if (s.vipLevel !== vipLevel) {
                            s.vipLevel = vipLevel;
                            SaveManager.save(s);
                            setSave(s);
                        }
                    }
                } catch (e) {
                    console.error('Failed to initialize SaveManager:', e);
                }
                if (isMounted) setSyncReady(true);
            } else {
                setSyncReady(true);
            }
        };
        initOmenX();
        return () => { isMounted = false; };
    }, [vipLevel]);

    const [selectedChar, setSelectedChar] = useState(save.lastSelectedChar || 'neobyte');
    const [selectedArena, setSelectedArena] = useState(save.lastSelectedArena || 'station');
    const [selectedDifficulty, setSelectedDifficulty] = useState(save.lastSelectedDifficulty || 'normal');
    const [selectedWeapon, setSelectedWeapon] = useState(save.lastSelectedWeapon || 'neoBlaster');
    const [isNGPlus, setIsNGPlus] = useState(save.isNGPlus || false);
    const [charTab, setCharTab] = useState('loadout');
    const { toast } = useToast();
    const { omenxBalance } = useCurrency();
    const touchStartX = React.useRef(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [buffPurchasing, setBuffPurchasing] = useState(false);
    const { pending: buffPending, confirm: confirmBuffPurchase } = useOmenXConfirmation('hub-xp-buff');

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
    
    // When save data arrives from cloud (after init), sync the selection state
    // to whatever was last used — but only ONCE. After that, the user's picks
    // are owned by local state; later save events must NOT overwrite them.
    React.useEffect(() => {
        if (!syncReady || initialSelectionApplied.current) return;
        if (save.lastSelectedChar && save.lastSelectedChar !== selectedChar) setSelectedChar(save.lastSelectedChar);
        if (save.lastSelectedArena && save.lastSelectedArena !== selectedArena) setSelectedArena(save.lastSelectedArena);
        if (save.lastSelectedDifficulty && save.lastSelectedDifficulty !== selectedDifficulty) setSelectedDifficulty(save.lastSelectedDifficulty);
        if (save.lastSelectedWeapon && save.lastSelectedWeapon !== selectedWeapon) setSelectedWeapon(save.lastSelectedWeapon);
        initialSelectionApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncReady, save.lastSelectedChar, save.lastSelectedArena, save.lastSelectedDifficulty, save.lastSelectedWeapon]);

    React.useEffect(() => {
        // Persist selection to save (debounced — avoids hammering localStorage and
        // dispatching saveUpdated on every rapid arrow-cycle, which used to cause
        // BuildSummary/cosmetic-preview to flicker as state churned).
        if (!syncReady) return;
        const t = setTimeout(() => {
            const current = SaveManager.load();
            const newSave = {
                ...current,
                lastSelectedChar: selectedChar,
                lastSelectedArena: selectedArena,
                lastSelectedDifficulty: selectedDifficulty,
                lastSelectedWeapon: selectedWeapon,
            };
            // Mark this timestamp so the saveUpdated listener can ignore the echo.
            const ts = Date.now();
            newSave.updated_at = ts;
            ownSaveTimestamps.current.add(ts);
            SaveManager.save(newSave);
        }, 250);
        return () => clearTimeout(t);
    }, [syncReady, selectedChar, selectedArena, selectedDifficulty, selectedWeapon]);

    // OmenX-only mode: skip Base44 reward claims

    const checkAndLaunch = async (mode) => {
        SoundManager.playUIClick();
        launchGame(mode);
    };

    const launchGame = async (mode) => {
        // Prefetch save from backend so Game page finds it in localStorage immediately (no blocking wait)
        const auth = getOmenXAuth();
        if (auth?.walletAddress && auth?.accessToken) {
            base44.functions.invoke('loadSave', { walletAddress: auth.walletAddress, accessToken: auth.accessToken })
                .then(({ data: response }) => {
                    if (response?.saveData) {
                        const existing = localStorage.getItem('cosmic_sloth_save');
                        if (existing) {
                            const merged = { ...JSON.parse(existing), ...(typeof response.saveData === 'string' ? JSON.parse(response.saveData) : response.saveData) };
                            localStorage.setItem('cosmic_sloth_save', JSON.stringify(merged));
                        } else {
                            localStorage.setItem('cosmic_sloth_save', JSON.stringify(response.saveData));
                        }
                    }
                })
                .catch(() => {}); // non-blocking, game will handle failure
        }
        navigate('/game', { state: { characterId: selectedChar, arenaId: selectedArena, difficultyId: selectedDifficulty, startingWeaponId: selectedWeapon, isNGPlus: isNGPlus, isEndless: mode === 'endless' } });
    };

    const startGame = () => checkAndLaunch('normal');



    // If not logged in with OmenX, show a gate (bypass in preview)
    if (!syncReady) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!save) return <div>Loading...</div>;
    if (!syncReady) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
      <OmenXGate isCarousel={isCarousel}>
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 p-1.5 pb-16 md:p-6 font-sans`}>
            {!isCarousel && <SpaceBackground />}
            <div className="max-w-6xl mx-auto relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1 md:gap-4 mb-1 md:mb-4 border-b border-fuchsia-900/40 pb-1 md:pb-4">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-xl md:text-4xl font-black tracking-widest uppercase" style={{ background: 'linear-gradient(90deg, #0CA7B8, #D946EF, #0CA7B8)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', dropShadow: '0 0 10px rgba(217,70,239,0.5)' }}>SLOTH COMMAND</h1>
                        <p className="text-slate-500 mt-0 md:text-sm text-[10px] tracking-widest uppercase hidden md:block">⚡ Rest · Upgrade · Prepare for the Cosmic Void</p>
                    </div>
                    <CurrencyHeader />
                </header>

                <div className="flex flex-col gap-2 md:gap-6">
                    <div className="flex-1 bg-[#0b0416]/60 backdrop-blur-xl rounded-xl md:rounded-2xl p-1.5 md:p-4 border border-[#D946EF]/30 shadow-[0_0_50px_rgba(217,70,239,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <div className="h-full flex flex-col justify-between">
                                <div>
                                    <h2 className="text-base md:text-lg font-bold text-white mb-2 md:mb-3 tracking-widest uppercase flex items-center gap-2"><span className="text-cyan-400">▶</span> Mission Briefing</h2>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5 md:gap-4 mb-1.5 md:mb-4">
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
                                                const isUnlocked = effectiveUnlockedCharacters.includes(char?.id);
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
                                                        
                                                        <div className="relative flex items-center justify-between p-2.5 md:p-4 min-h-[110px] md:min-h-[140px]">
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
                                                                        <div className="flex flex-wrap gap-1.5 md:gap-2 text-[9px] md:text-[10px] mb-1 bg-[#0b0416]/80 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-cyan-500/30 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]">
                                                                            <span className="text-slate-300">HP: <span className={char.hp > CHARACTERS[0].hp ? 'text-green-400 font-bold' : char.hp < CHARACTERS[0].hp ? 'text-red-400 font-bold' : 'text-white'}>{char.hp}{char.hp > CHARACTERS[0].hp ? '↑' : char.hp < CHARACTERS[0].hp ? '↓' : ''}</span></span>
                                                                            <span className="text-slate-300">SPD: <span className={char.speed > CHARACTERS[0].speed ? 'text-green-400 font-bold' : char.speed < CHARACTERS[0].speed ? 'text-red-400 font-bold' : 'text-white'}>{char.speed}{char.speed > CHARACTERS[0].speed ? '↑' : char.speed < CHARACTERS[0].speed ? '↓' : ''}</span></span>
                                                                            <span className="text-slate-300">ARM: <span className={char.armor > CHARACTERS[0].armor ? 'text-green-400 font-bold' : char.armor < CHARACTERS[0].armor ? 'text-red-400 font-bold' : 'text-white'}>{char.armor}{char.armor > CHARACTERS[0].armor ? '↑' : char.armor < CHARACTERS[0].armor ? '↓' : ''}</span></span>
                                                                            <span className="text-slate-300">DMG: <span className={char.damageMult > CHARACTERS[0].damageMult ? 'text-green-400 font-bold' : char.damageMult < CHARACTERS[0].damageMult ? 'text-red-400 font-bold' : 'text-white'}>{Math.round(char.damageMult * 100)}%{char.damageMult > CHARACTERS[0].damageMult ? '↑' : char.damageMult < CHARACTERS[0].damageMult ? '↓' : ''}</span></span>
                                                                            <span className="text-slate-300">CD: <span className={char.cooldownMult < CHARACTERS[0].cooldownMult ? 'text-green-400 font-bold' : char.cooldownMult > CHARACTERS[0].cooldownMult ? 'text-red-400 font-bold' : 'text-white'}>{Math.round(char.cooldownMult * 100)}%{char.cooldownMult < CHARACTERS[0].cooldownMult ? '↑' : char.cooldownMult > CHARACTERS[0].cooldownMult ? '↓' : ''}</span></span>
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
                                                                        🎯 Own NFT or Reach Kill Milestones
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
                                            
                                            <div className="relative flex items-center justify-between p-2 md:p-3 min-h-[72px] md:min-h-[96px]">
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
                                                        <span className="inline-flex items-center gap-1 text-cyan-300 font-black tracking-widest text-[9px] md:text-[10px] bg-cyan-950/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-cyan-500/50 backdrop-blur-sm shadow-[0_0_10px_rgba(6,182,212,0.2)]">
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
                                            
                                            <div className="relative flex items-center justify-between p-2 md:p-3 min-h-[72px] md:min-h-[96px]">
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
                                        {(() => {
                                            // NG+ unlock: every unlocked character must have unlocked every sector.
                                            // (Previously gated by save.newGamePlusUnlocked — now computed live.)
                                            const allArenaIds = ARENAS.map(a => a.id);
                                            const unlockedChars = effectiveUnlockedCharacters || [];
                                            const ngPlusReady = unlockedChars.length > 0 && unlockedChars.every(charId => {
                                                const arenasForChar = save?.unlockedArenasByCharacter?.[charId] || ['station'];
                                                return allArenaIds.every(aid => arenasForChar.includes(aid));
                                            });
                                            if (!ngPlusReady) return null;
                                            return (
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
                                            );
                                        })()}
                                        </div>
                                    </div>
                                </div>

                                {(() => {
                                    const isCharUnlocked = effectiveUnlockedCharacters.includes(selectedChar);
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
                                    
                                    const buyBuff = () => {
                                        if ((omenxBalance ?? 0) < 10) return;
                                        if (hasXpBuff || buffPurchasing) return; // prevent double-buy while one is in flight or already active
                                        SoundManager.playUIClick();
                                        confirmBuffPurchase(10, '+50% XP Buff (60 min)', async () => {
                                            // Re-check inside the async callback — guards against double-tap
                                            // on the confirm modal queuing two purchases (Texxy bug 2026-05-03).
                                            if (buffPurchasing) return;
                                            setBuffPurchasing(true);
                                            try {
                                                // Server-authoritative: purchaseSku grants the buff using the
                                                // server clock and rejects if one is already active. Client
                                                // never sets xpExpiry directly anymore.
                                                const res = await base44.functions.invoke('purchaseSku', {
                                                    skuId: IN_GAME_SKUS.xpSession,
                                                    quantity: 1,
                                                    grantInfo: { type: 'xp_buff' },
                                                });
                                                if (!res.data?.success) {
                                                    toast({ title: 'Purchase Failed', description: res.data?.error || 'Try again.' });
                                                    return;
                                                }
                                                // Adopt server-returned saveData (authoritative xpExpiry from server clock)
                                                if (res.data.saveData) {
                                                    const merged = { ...SaveManager.load(), ...res.data.saveData };
                                                    SaveManager.save(merged);
                                                    setSave(merged);
                                                }
                                                refreshBalance();
                                                toast({ title: "Buff Activated", description: `+50% XP for 60 minutes!` });
                                            } finally {
                                                setBuffPurchasing(false);
                                            }
                                        });
                                    };
                                    
                                    return (
                                        <div className="flex flex-col gap-2 md:gap-3 mt-2 md:mt-6 pt-2 md:pt-4 border-t border-slate-700/40">

                                            <BuildSummary save={save} selectedChar={selectedChar} currentTime={currentTime} />

                                            <button
                                                onClick={() => { SoundManager.playUIClick(); navigate('/loadouts'); }}
                                                className="relative bg-[#0b0416]/80 backdrop-blur-xl rounded-lg md:rounded-xl border border-cyan-500/50 hover:border-cyan-400 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all group"
                                                title="Save & swap full configurations"
                                            >
                                                <div className="relative flex items-center justify-between p-2 md:p-3 min-h-[72px] md:min-h-[96px]">
                                                    <span className="flex items-center gap-2 md:gap-3 z-10">
                                                        <span className="text-xl md:text-2xl">💾</span>
                                                        <span className="flex flex-col items-start">
                                                            <span className="text-sm md:text-lg font-black tracking-widest uppercase text-white group-hover:text-cyan-200 transition-colors">
                                                                Loadout Presets
                                                            </span>
                                                            <span className="text-[10px] md:text-xs text-slate-400 group-hover:text-slate-300 font-normal normal-case tracking-normal">
                                                                Save & swap full configurations
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <span className="text-cyan-300 text-lg md:text-xl font-black group-hover:translate-x-1 transition-transform z-10">→</span>
                                                </div>
                                            </button>

                                            <button
                                                onClick={buyBuff}
                                                disabled={hasXpBuff || buffPurchasing || (omenxBalance ?? 0) < 10}
                                                className={`w-full flex items-center justify-between gap-2 md:gap-3 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-2.5 border transition-all group ${
                                                    hasXpBuff
                                                        ? 'bg-emerald-950/60 border-emerald-500/60 cursor-default'
                                                        : (omenxBalance ?? 0) < 10 || buffPurchasing
                                                            ? 'bg-slate-900/60 border-slate-700 opacity-60 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-purple-950/40 hover:from-emerald-900/60 hover:via-cyan-900/40 hover:to-purple-900/60 border-emerald-500/40 hover:border-emerald-400'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2 md:gap-3">
                                                    <span className="text-base md:text-lg">✨</span>
                                                    <span className="flex flex-col items-start">
                                                        <span className="text-[11px] md:text-sm font-black tracking-widest uppercase text-white">
                                                            {hasXpBuff ? `+50% XP Active (${timeLeft})` : '+50% XP Buff · 60 min'}
                                                        </span>
                                                        <span className="text-[9px] md:text-[11px] text-emerald-300/70 font-normal normal-case tracking-normal hidden sm:inline">
                                                            Boost XP gain for your next session
                                                        </span>
                                                    </span>
                                                </span>
                                                {!hasXpBuff && !buffPurchasing && (
                                                    <span className="flex items-center gap-1 bg-purple-950/60 border border-purple-500/50 px-2 md:px-2.5 py-1 md:py-1.5 rounded shrink-0">
                                                        <span className="text-purple-300 font-black text-xs md:text-sm">10</span>
                                                        <span className="text-purple-400 font-bold text-[9px] md:text-[10px] tracking-wider">OMENX</span>
                                                    </span>
                                                )}
                                                {buffPurchasing && (
                                                    <span className="text-slate-400 text-xs md:text-sm font-bold">Processing…</span>
                                                )}
                                            </button>

                                            <div className="flex flex-row gap-1.5 md:gap-3 sticky bottom-2 md:static z-30 bg-[#0b0416]/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none p-2 md:p-0 -mx-2 md:mx-0 rounded-xl md:rounded-none border border-cyan-500/30 md:border-0 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] md:shadow-none">
                                            <button
                                                onClick={() => canLaunch && checkAndLaunch('normal')}
                                                disabled={!canLaunch}
                                                className={`flex-1 text-white text-sm md:text-xl font-black py-3.5 md:py-5 rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all transform tracking-widest uppercase ${
                                                    canLaunch
                                                    ? 'bg-gradient-to-r from-[#0CA7B8] to-cyan-400 hover:from-cyan-400 hover:to-[#0CA7B8] hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(12,167,184,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]'
                                                    : 'bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/50'
                                                }`}
                                            >
                                                {!isCharUnlocked ? (
                                                    <>LOCKED</>
                                                ) : !isArenaUnlocked ? (
                                                    <>LOCKED</>
                                                ) : (
                                                    <>LAUNCH <ArrowRight className="w-5 h-5 md:w-5 md:h-5" /></>
                                                )}
                                            </button>
                                            
                                            <div className="flex-1 flex flex-col gap-0.5">
                                                <button
                                                    onClick={() => canLaunch && checkAndLaunch('endless')}
                                                    disabled={!canLaunch}
                                                    className={`w-full text-white text-sm md:text-xl font-black py-3.5 md:py-5 rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all transform tracking-widest uppercase ${
                                                        canLaunch
                                                        ? 'bg-gradient-to-r from-[#D946EF] to-fuchsia-400 hover:from-fuchsia-400 hover:to-[#D946EF] hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(217,70,239,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]'
                                                        : 'bg-slate-800/60 text-slate-600 cursor-not-allowed border border-slate-700/50'
                                                    }`}
                                                >
                                                    {!isCharUnlocked ? (
                                                        <>LOCKED</>
                                                    ) : !isArenaUnlocked ? (
                                                        <>LOCKED</>
                                                    ) : (
                                                        <>ENDLESS <ArrowRight className="w-5 h-5 md:w-5 md:h-5" /></>
                                                    )}
                                                </button>
                                                {canLaunch && (
                                                    <div className="text-[8px] md:text-[10px] text-fuchsia-300/70 text-center tracking-wider uppercase font-bold leading-tight hidden md:block">
                                                        Score & Mastery — Gold capped (~720/min, 18k max)
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        </div>
                                    );
                                })()}
                            </div>
                    </div>

                </div>
            </div>
            {buffPending && (
                <OmenXConfirmation
                    amount={buffPending.amount}
                    itemName={buffPending.itemName}
                    onConfirm={buffPending.onConfirm}
                    onCancel={buffPending.onCancel}
                    pageId="hub-xp-buff"
                />
            )}
        </div>
      </OmenXGate>
    );
}