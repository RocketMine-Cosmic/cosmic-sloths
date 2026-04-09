import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { COMPANIONS } from '../game/Constants';
import { ArrowLeft, Coins, Hexagon, ShieldPlus } from 'lucide-react';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import { SoundManager } from '../game/SoundManager';

export default function Companions({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());

    useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    const handleBuyCompanion = (comp) => {
        const unlocked = save.unlockedCompanions || [];
        if (unlocked.includes(comp.id)) return;
        
        if (save.gold >= comp.baseCost) {
            const newSave = { ...save, gold: save.gold - comp.baseCost };
            newSave.unlockedCompanions = [...unlocked, comp.id];
            
            // Automatically equip if none equipped
            if (!newSave.equippedCompanion) {
                newSave.equippedCompanion = comp.id;
            }
            
            SaveManager.save(newSave);
            setSave(newSave);
            SoundManager.playUIClick();
        }
    };

    const handleUpgradeCompanion = (comp) => {
        const levels = save.companionLevels || {};
        const currentLevel = levels[comp.id] || 1;
        if (currentLevel >= 10) return; // Max level 10
        
        const cost = Math.floor(comp.baseCost * Math.pow(1.5, currentLevel - 1));
        
        if (save.gold >= cost) {
            const newSave = { ...save, gold: save.gold - cost };
            newSave.companionLevels = { ...levels, [comp.id]: currentLevel + 1 };
            SaveManager.save(newSave);
            setSave(newSave);
            SoundManager.playLevelUp();
        }
    };

    const handleEquip = (compId) => {
        const newSave = { ...save, equippedCompanion: save.equippedCompanion === compId ? null : compId };
        SaveManager.save(newSave);
        setSave(newSave);
        SoundManager.playUIClick();
    };

    return (
        <div className={`${isCarousel ? 'h-full flex flex-col' : 'min-h-screen flex flex-col'} relative text-slate-200 p-2 pb-20 md:p-6 font-sans overflow-y-auto`}>
            {!isCarousel && <SpaceBackground />}
            <div className="max-w-5xl mx-auto w-full z-10 relative">
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
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-2" style={{ background: 'linear-gradient(90deg, #00FFFF, #00FF00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(0,255,255,0.5))' }}>
                            <ShieldPlus className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" /> COMPANIONS
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">
                            Never face the cosmos alone.
                        </p>
                    </div>
                    <CurrencyHeader />
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {COMPANIONS.map(comp => {
                        const unlocked = save.unlockedCompanions || [];
                        const isOwned = unlocked.includes(comp.id);
                        const isEquipped = save.equippedCompanion === comp.id;
                        const levels = save.companionLevels || {};
                        const currentLevel = isOwned ? (levels[comp.id] || 1) : 0;
                        const isMax = currentLevel >= 10;
                        const upgradeCost = Math.floor(comp.baseCost * Math.pow(1.5, Math.max(1, currentLevel) - 1));
                        const canAffordBuy = save.gold >= comp.baseCost;
                        const canAffordUpgrade = save.gold >= upgradeCost;

                        return (
                            <div key={comp.id} className={`bg-[#0b0416]/80 backdrop-blur-xl border-2 rounded-xl p-4 md:p-6 transition-all ${isEquipped ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'border-slate-700 hover:border-slate-600'}`}>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-full border-2 shrink-0 flex items-center justify-center text-3xl shadow-lg bg-slate-900" style={{ borderColor: comp.color, boxShadow: `0 0 15px ${comp.color}40` }}>
                                        {comp.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-xl text-white tracking-widest uppercase" style={{ color: comp.color, textShadow: `0 0 10px ${comp.color}80` }}>{comp.name}</h3>
                                            {isEquipped && <span className="bg-cyan-900/50 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded border border-cyan-500/50">EQUIPPED</span>}
                                        </div>
                                        <p className="text-slate-400 text-sm mt-1 leading-snug">{comp.desc}</p>
                                    </div>
                                </div>

                                {isOwned && (
                                    <div className="mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-bold text-slate-300">Level {currentLevel}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">{isMax ? 'MAX LEVEL' : 'Upgradeable'}</span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${(currentLevel / 10) * 100}%` }} />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {!isOwned ? (
                                        <button 
                                            onClick={() => handleBuyCompanion(comp)}
                                            disabled={!canAffordBuy}
                                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${canAffordBuy ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                                        >
                                            <Coins className="w-4 h-4 fill-current" /> {comp.baseCost.toLocaleString()} Gold
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleEquip(comp.id)}
                                                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${isEquipped ? 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'}`}
                                            >
                                                {isEquipped ? 'UNEQUIP' : 'EQUIP'}
                                            </button>
                                            {!isMax && (
                                                <button 
                                                    onClick={() => handleUpgradeCompanion(comp)}
                                                    disabled={!canAffordUpgrade}
                                                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors flex flex-col items-center justify-center leading-none gap-0.5 ${canAffordUpgrade ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                                                >
                                                    <span>UPGRADE</span>
                                                    <span className="flex items-center gap-1 font-mono"><Coins className="w-3 h-3 fill-current" /> {upgradeCost.toLocaleString()}</span>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}