import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { SYNERGIES, WEAPONS } from '../game/Constants';
import { ArrowLeft, BookOpen, Lock, Sparkles, Crosshair, Zap, Timer, CheckCircle2 } from 'lucide-react';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import { SoundManager } from '../game/SoundManager';
import WeaponSimulation from '../components/game/WeaponSimulation';

export default function SynergyCodex({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const [activeTab, setActiveTab] = useState('synergies'); // 'synergies' or 'mastery'
    const [previewWeapon, setPreviewWeapon] = useState(null);

    useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    const discovered = save.discoveredSynergies || [];

    return (
        <div className={`${isCarousel ? 'h-full flex flex-col' : 'h-[100dvh] flex flex-col'} relative text-slate-200 p-2 pb-2 md:p-6 font-sans overflow-hidden`}>
            {!isCarousel && <SpaceBackground />}
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-slate-800 pb-2 md:pb-4 shrink-0">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-2" style={{ background: 'linear-gradient(90deg, #F43F5E, #E11D48)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(244,63,94,0.5))' }}>
                            <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-rose-500" /> THE CODEX
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">
                            Archive of Cosmic Weaponry
                        </p>
                    </div>
                    <CurrencyHeader />
                </header>

                <div className="flex justify-center gap-2 mb-4 w-full max-w-2xl shrink-0 mx-auto">
                    <button onClick={() => { SoundManager.playUIClick(); setActiveTab('synergies'); setPreviewWeapon(null); }} className={`flex-1 px-2 md:px-4 py-2 md:py-3 font-bold uppercase tracking-widest text-[10px] md:text-sm rounded-lg border transition-all ${activeTab === 'synergies' ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                        Weapon Synergies
                    </button>
                    <button onClick={() => { SoundManager.playUIClick(); setActiveTab('mastery'); }} className={`flex-1 px-2 md:px-4 py-2 md:py-3 font-bold uppercase tracking-widest text-[10px] md:text-sm rounded-lg border transition-all ${activeTab === 'mastery' ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                        Weapon Mastery
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-20">
                    {activeTab === 'synergies' && (
                        <>
                            <p className="text-slate-300 text-xs md:text-base text-center">Combine specific fully leveled weapons to create devastating synergies.</p>
                            <div className="text-center text-xs text-rose-400 font-bold mb-4">Discovered: {discovered.length} / {SYNERGIES.length}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {SYNERGIES.map((synergy, index) => {
                            const resultWeapon = WEAPONS[synergy.result];
                            const w1 = WEAPONS[synergy.weapon1];
                            const w2 = WEAPONS[synergy.weapon2];
                            const isDiscovered = discovered.includes(synergy.result);

                            return (
                                <div key={index} className={`p-3 md:p-4 rounded-xl border-2 transition-all flex flex-col h-full ${
                                    isDiscovered 
                                    ? 'bg-[#0b0416]/80 backdrop-blur-xl border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                                    : 'bg-slate-900/60 border-slate-800'
                                }`}>
                                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                        <div className={`p-2 md:p-3 rounded-lg border shrink-0 ${isDiscovered ? 'bg-rose-950/50 border-rose-500/50 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                            {isDiscovered ? <Sparkles className="w-5 h-5 md:w-6 md:h-6" /> : <Lock className="w-5 h-5 md:w-6 md:h-6" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className={`font-black text-base md:text-lg tracking-widest uppercase truncate ${isDiscovered ? 'text-white' : 'text-slate-500'}`}>
                                                {isDiscovered ? resultWeapon.name : 'Unknown Synergy'}
                                            </h3>
                                            <p className="text-[10px] md:text-xs text-slate-400 line-clamp-2">
                                                {isDiscovered ? resultWeapon.desc : 'Discover this synergy in a run to reveal its true power.'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold bg-slate-950/50 p-2 md:p-3 rounded-lg border border-slate-800">
                                            <div className={`flex-1 text-center truncate ${isDiscovered ? 'text-cyan-400' : 'text-slate-500'}`}>{w1.name}</div>
                                            <div className="text-slate-600">+</div>
                                            <div className={`flex-1 text-center truncate ${isDiscovered ? 'text-amber-400' : 'text-slate-500'}`}>{w2.name}</div>
                                        </div>

                                        {isDiscovered && (
                                            <div className="mt-2 md:mt-3 grid grid-cols-3 gap-1.5 md:gap-2 text-center text-[10px] md:text-xs">
                                                <div className="bg-slate-950 p-1.5 md:p-2 rounded border border-slate-800">
                                                    <div className="text-slate-500 mb-0.5 md:mb-1">Base Dmg</div>
                                                    <div className="font-mono text-rose-400">{resultWeapon.baseDamage}</div>
                                                </div>
                                                <div className="bg-slate-950 p-1.5 md:p-2 rounded border border-slate-800">
                                                    <div className="text-slate-500 mb-0.5 md:mb-1">Cooldown</div>
                                                    <div className="font-mono text-cyan-400">{resultWeapon.baseCooldown}s</div>
                                                </div>
                                                <div className="bg-slate-950 p-1.5 md:p-2 rounded border border-slate-800">
                                                    <div className="text-slate-500 mb-0.5 md:mb-1">Area</div>
                                                    <div className="font-mono text-amber-400">{resultWeapon.baseArea}x</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                            </div>
                        </>
                    )}

                    {activeTab === 'mastery' && (
                        <>
                            <p className="text-slate-300 text-xs md:text-base text-center mb-6">Upgrade your weapons in the <strong className="text-white">Lounge Armory</strong> to unlock their final Mastery forms.</p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {Object.values(WEAPONS).filter(w => !w.isSynergy && !w.isEvolution).map((weapon, index) => {
                                    const getWeaponUpgrade = (wId, stat) => {
                                        const perm = save.permanentWeaponUpgrades?.[wId]?.[stat] || 0;
                                        const week = save.weeklyWeaponUpgrades?.[wId]?.[stat] || 0;
                                        const season = save.seasonalWeaponUpgrades?.[wId]?.[stat] || 0;
                                        return perm + week + season;
                                    };
                                    
                                    const dmgLvl = getWeaponUpgrade(weapon.id, 'damage');
                                    const areaLvl = getWeaponUpgrade(weapon.id, 'area');
                                    const cdLvl = getWeaponUpgrade(weapon.id, 'cooldown');
                                    
                                    const isMastered = dmgLvl >= 5 && areaLvl >= 5 && cdLvl >= 5;
                                    const isPreviewing = previewWeapon === weapon.id;
                                    
                                    return (
                                        <div key={index} className={`p-4 rounded-xl border-2 transition-all flex flex-col h-full ${
                                            isMastered 
                                            ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                            : 'bg-slate-900/60 border-slate-800'
                                        }`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className={`font-black text-xl tracking-widest uppercase flex items-center gap-2 ${isMastered ? 'text-amber-400' : 'text-slate-300'}`}>
                                                        {weapon.name} {isMastered && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                                                    </h3>
                                                    <p className="text-xs text-slate-400">{weapon.desc}</p>
                                                </div>
                                                {isMastered && (
                                                    <span className="text-[10px] font-bold text-amber-900 bg-amber-500 px-2 py-1 rounded">MASTERED</span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between gap-2 mb-4 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                                <div className="flex flex-col items-center">
                                                    <Zap className={`w-4 h-4 mb-1 ${dmgLvl >= 5 ? 'text-amber-400' : 'text-slate-500'}`} />
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Damage</div>
                                                    <div className="text-xs font-mono text-white">{dmgLvl}/5</div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <Sparkles className={`w-4 h-4 mb-1 ${areaLvl >= 5 ? 'text-amber-400' : 'text-slate-500'}`} />
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Area</div>
                                                    <div className="text-xs font-mono text-white">{areaLvl}/5</div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <Timer className={`w-4 h-4 mb-1 ${cdLvl >= 5 ? 'text-amber-400' : 'text-slate-500'}`} />
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Cooldown</div>
                                                    <div className="text-xs font-mono text-white">{cdLvl}/5</div>
                                                </div>
                                            </div>
                                            
                                            <div className="mb-4">
                                                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Mastery Effect</div>
                                                {isMastered ? (
                                                    <div className="text-sm font-bold text-amber-300 bg-amber-900/30 p-2 rounded border border-amber-500/30">
                                                        ✨ {weapon.masteryDesc?.replace('MASTERY: ', '') || 'Unlocks devastating potential.'}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm font-bold text-slate-600 bg-slate-950 p-2 rounded border border-slate-800 select-none blur-sm pointer-events-none opacity-50">
                                                        ✨ {weapon.masteryDesc?.replace('MASTERY: ', '') || 'Unlocks devastating potential.'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-auto pt-2 border-t border-slate-800/50">
                                                <button 
                                                    onClick={() => {
                                                        SoundManager.playUIClick();
                                                        setPreviewWeapon(isPreviewing ? null : weapon.id);
                                                    }}
                                                    className={`w-full py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                                                        isPreviewing 
                                                        ? 'bg-slate-700 text-white' 
                                                        : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                                    }`}
                                                >
                                                    <Crosshair className="w-4 h-4" /> 
                                                    {isPreviewing ? 'Close Simulation' : 'Enter Simulation Chamber'}
                                                </button>
                                                
                                                {isPreviewing && (
                                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <WeaponSimulation weaponId={weapon.id} isMastered={isMastered} />
                                                        <div className="text-[10px] text-slate-500 text-center mt-2 italic">
                                                            {isMastered ? "Showing fully mastered potential." : "Showing base Level 1 potential."}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}