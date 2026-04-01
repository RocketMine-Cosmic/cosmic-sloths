import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { SYNERGIES, WEAPONS } from '../game/Constants';
import { ArrowLeft, BookOpen, Lock, Sparkles } from 'lucide-react';
import SpaceBackground from '../components/game/SpaceBackground';
import { SoundManager } from '../game/SoundManager';

export default function SynergyCodex({ isCarousel }) {
    const navigate = useNavigate();
    const save = SaveManager.load();
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
                            <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-rose-500" /> SYNERGY CODEX
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">
                            Discovered Synergies: <span className="text-rose-400 font-bold">{discovered.length} / {SYNERGIES.length}</span>
                        </p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    <p className="text-slate-300 text-xs md:text-base">Combine specific fully leveled weapons to create devastating synergies.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SYNERGIES.map((synergy, index) => {
                            const resultWeapon = WEAPONS[synergy.result];
                            const w1 = WEAPONS[synergy.weapon1];
                            const w2 = WEAPONS[synergy.weapon2];
                            const isDiscovered = discovered.includes(synergy.result);

                            return (
                                <div key={index} className={`p-4 rounded-xl border-2 transition-all ${
                                    isDiscovered 
                                    ? 'bg-[#0b0416]/80 backdrop-blur-xl border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                                    : 'bg-slate-900/60 border-slate-800'
                                }`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`p-3 rounded-lg border ${isDiscovered ? 'bg-rose-950/50 border-rose-500/50 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                            {isDiscovered ? <Sparkles className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className={`font-black text-lg tracking-widest uppercase ${isDiscovered ? 'text-white' : 'text-slate-500'}`}>
                                                {isDiscovered ? resultWeapon.name : 'Unknown Synergy'}
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                {isDiscovered ? resultWeapon.desc : 'Discover this synergy in a run to reveal its true power.'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs md:text-sm font-bold bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                        <div className={`flex-1 text-center truncate ${isDiscovered ? 'text-cyan-400' : 'text-slate-500'}`}>{w1.name}</div>
                                        <div className="text-slate-600">+</div>
                                        <div className={`flex-1 text-center truncate ${isDiscovered ? 'text-amber-400' : 'text-slate-500'}`}>{w2.name}</div>
                                    </div>

                                    {isDiscovered && (
                                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                                            <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                                <div className="text-slate-500 mb-1">Base Dmg</div>
                                                <div className="font-mono text-rose-400">{resultWeapon.baseDamage}</div>
                                            </div>
                                            <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                                <div className="text-slate-500 mb-1">Cooldown</div>
                                                <div className="font-mono text-cyan-400">{resultWeapon.baseCooldown}s</div>
                                            </div>
                                            <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                                <div className="text-slate-500 mb-1">Area</div>
                                                <div className="font-mono text-amber-400">{resultWeapon.baseArea}x</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}