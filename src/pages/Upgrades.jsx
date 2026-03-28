import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, CHARACTER_TALENTS, WEAPONS } from '../game/Constants';
import { Zap, Timer, Sparkles, ArrowLeft } from 'lucide-react';
import UpgradesTab from '../components/game/UpgradesTab';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';

const UPGRADE_COSTS = [500, 1000, 2000, 4000, 8000];

export default function Upgrades({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const [activeTab, setActiveTab] = useState('upgrades');
    const [selectedChar, setSelectedChar] = useState(save.unlockedCharacters[0] || 'neobyte');

    const recordTokenSpend = (amount) => {
        const week_id = moment().format('YYYY-[W]ww');
        const seasonNum = Math.floor(moment().week() / 4) + 1;
        const season_id = `${moment().format('YYYY')}-S${seasonNum}`;
        base44.functions.invoke('recordTokenSpend', { amount, week_id, season_id }).catch(console.error);
    };

    const handleBuyWeaponUpgrade = (weaponId, stat, currency = 'gold') => {
        const weaponData = save.weaponUpgrades?.[weaponId] || {};
        const currentLevel = weaponData[stat] || 0;
        if (currentLevel >= UPGRADE_COSTS.length) return;
        
        const cost = UPGRADE_COSTS[currentLevel];
        const tokenCost = Math.max(1, Math.floor(cost / 4));
        
        if (currency === 'gold' && save.gold >= cost) {
            const newSave = { ...save, gold: save.gold - cost };
            if (!newSave.weaponUpgrades) newSave.weaponUpgrades = {};
            if (!newSave.weaponUpgrades[weaponId]) newSave.weaponUpgrades[weaponId] = {};
            newSave.weaponUpgrades[weaponId][stat] = currentLevel + 1;
            SaveManager.save(newSave);
            setSave(newSave);
        } else if (currency === 'token' && (save.cosmicTokens || 0) >= tokenCost) {
            const newSave = { ...save, cosmicTokens: (save.cosmicTokens || 0) - tokenCost };
            if (!newSave.weaponUpgrades) newSave.weaponUpgrades = {};
            if (!newSave.weaponUpgrades[weaponId]) newSave.weaponUpgrades[weaponId] = {};
            newSave.weaponUpgrades[weaponId][stat] = currentLevel + 1;
            SaveManager.save(newSave);
            setSave(newSave);
            recordTokenSpend(tokenCost);
        }
    };

    const handleBuyTalent = (talent, currency = 'gold') => {
        const tokenCost = Math.max(1, Math.floor(talent.cost / 4));

        if (currency === 'gold' && save.gold >= talent.cost) {
            const newSave = { ...save, gold: save.gold - talent.cost };
            if (!newSave.unlockedTalents[selectedChar]) {
                newSave.unlockedTalents[selectedChar] = [];
            }
            newSave.unlockedTalents[selectedChar].push(talent.id);
            SaveManager.save(newSave);
            setSave(newSave);
        } else if (currency === 'token' && (save.cosmicTokens || 0) >= tokenCost) {
            const newSave = { ...save, cosmicTokens: (save.cosmicTokens || 0) - tokenCost };
            if (!newSave.unlockedTalents[selectedChar]) {
                newSave.unlockedTalents[selectedChar] = [];
            }
            newSave.unlockedTalents[selectedChar].push(talent.id);
            SaveManager.save(newSave);
            setSave(newSave);
            recordTokenSpend(tokenCost);
        }
    };

    const renderArmory = () => {
        const baseWeapons = Object.values(WEAPONS).filter(w => !w.isSynergy);
        const upgradeTypes = [
            { id: 'damage', name: 'Damage', icon: Zap, desc: '+10% per level' },
            { id: 'area', name: 'Area', icon: Sparkles, desc: '+10% per level' },
            { id: 'cooldown', name: 'Cooldown', icon: Timer, desc: '-5% per level' }
        ];

        return (
            <div className="space-y-4 md:space-y-6">
                {baseWeapons.map(weapon => {
                    const wUpgrades = save.weaponUpgrades?.[weapon.id] || {};
                    const isMastered = (wUpgrades.damage || 0) >= UPGRADE_COSTS.length && 
                                       (wUpgrades.area || 0) >= UPGRADE_COSTS.length && 
                                       (wUpgrades.cooldown || 0) >= UPGRADE_COSTS.length;

                    return (
                    <div key={weapon.id} className={`bg-slate-800 p-4 rounded-xl border ${isMastered ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-slate-700'}`}>
                        <div className="mb-4">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className={`font-bold text-lg md:text-xl ${isMastered ? 'text-yellow-400' : 'text-white'}`}>{weapon.name}</h3>
                                {isMastered && (
                                    <div className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-1 rounded border border-yellow-500/50">
                                        MASTERED
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-400 text-xs md:text-sm">{weapon.desc}</p>
                            {isMastered && (
                                <p className="text-yellow-300 text-xs md:text-sm font-bold mt-2">✨ {weapon.masteryDesc}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                            {upgradeTypes.map(stat => {
                                const level = save.weaponUpgrades?.[weapon.id]?.[stat.id] || 0;
                                const cost = UPGRADE_COSTS[level];
                                const isMax = level >= UPGRADE_COSTS.length;
                                const canAfford = save.gold >= cost;
                                const Icon = stat.icon;

                                return (
                                    <div key={stat.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Icon size={16} className="text-cyan-400" />
                                                <div>
                                                    <div className="font-bold text-xs md:text-sm leading-tight">{stat.name}</div>
                                                    <div className="text-[10px] text-slate-500 leading-tight">{stat.desc}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className={`w-2 h-2 rounded-sm ${i < level ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full">
                                            <button
                                                onClick={() => handleBuyWeaponUpgrade(weapon.id, stat.id, 'gold')}
                                                disabled={isMax || !canAfford}
                                                className={`flex-1 py-1.5 rounded font-bold transition-colors text-xs ${
                                                    isMax ? 'bg-slate-800 text-slate-600' :
                                                    canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' :
                                                    'bg-slate-800 text-slate-500 border border-slate-700'
                                                }`}
                                            >
                                                {isMax ? 'MAX' : `🪙 ${cost}`}
                                            </button>
                                            {!isMax && (
                                                <button
                                                    onClick={() => handleBuyWeaponUpgrade(weapon.id, stat.id, 'token')}
                                                    disabled={(save.cosmicTokens || 0) < Math.max(1, Math.floor(cost / 4))}
                                                    className={`flex-1 py-1.5 rounded font-bold transition-colors text-xs ${
                                                        (save.cosmicTokens || 0) >= Math.max(1, Math.floor(cost / 4)) ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                                                        'bg-slate-800 text-slate-500 border border-slate-700'
                                                    }`}
                                                >
                                                    💠 {Math.max(1, Math.floor(cost / 4))}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    );
                })}
            </div>
        );
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
                        <h1 className="text-3xl md:text-4xl font-bold text-pink-400 tracking-tight">UPGRADE LOUNGE</h1>
                        <p className="text-slate-400 mt-1 text-sm md:text-base">Enhance your operatives and arsenal.</p>
                    </div>
                    <div className="flex gap-2 md:gap-4">
                        <div className="text-base md:text-lg font-bold text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg" title="Cosmic Tokens (Crypto)">
                            💠 {save.cosmicTokens || 0}
                        </div>
                        <div className="text-base md:text-lg font-bold text-yellow-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg" title="Gold">
                            🪙 {save.gold}
                        </div>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-64 grid grid-cols-3 sm:grid-cols-3 md:flex md:flex-col gap-2 pb-2 md:pb-0">
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('upgrades'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'upgrades' ? 'bg-pink-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            ⚙️ Upgrades
                        </button>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('talents'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'talents' ? 'bg-pink-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            🧬 Skill Tree
                        </button>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('armory'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'armory' ? 'bg-pink-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            ⚔️ Armory
                        </button>
                    </div>

                    <div className="flex-1 bg-slate-900 rounded-2xl p-4 md:p-8 border border-slate-800 min-h-[500px] md:min-h-[600px]">
                        {activeTab === 'upgrades' && <UpgradesTab save={save} setSave={setSave} SaveManager={SaveManager} />}
                        {activeTab === 'armory' && renderArmory()}
                        {activeTab === 'talents' && (
                            <div>
                                <div className="flex items-center gap-4 mb-4 md:mb-6 overflow-x-auto pb-2">
                                    {save.unlockedCharacters.map(charId => {
                                        const char = CHARACTERS.find(c => c.id === charId);
                                        if (!char) return null;
                                        return (
                                            <button
                                                key={char.id}
                                                onClick={() => setSelectedChar(char.id)}
                                                className={`shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full border-2 overflow-hidden ${selectedChar === char.id ? 'border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'border-slate-700 opacity-50 hover:opacity-100'}`}
                                            >
                                                {char.image ? <img src={char.image} alt={char.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">{CHARACTERS.find(c => c.id === selectedChar)?.name}'s Talents</h2>
                                <div className="space-y-4 relative">
                                    <div className="absolute left-[38px] md:left-[46px] top-8 bottom-8 w-1 bg-slate-800 z-0"></div>
                                    
                                    {(CHARACTER_TALENTS[selectedChar] || []).map((talent, index) => {
                                        const unlocked = save.unlockedTalents[selectedChar] || [];
                                        const isUnlocked = unlocked.includes(talent.id);
                                        const canUnlock = !isUnlocked && (index === 0 || unlocked.includes(CHARACTER_TALENTS[selectedChar][index-1].id));
                                        const canAfford = save.gold >= talent.cost;
                                        
                                        return (
                                            <div key={talent.id} className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 bg-slate-900 p-4 rounded-xl border border-slate-700">
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shrink-0 border-4 ${
                                                        isUnlocked ? 'bg-pink-900 border-pink-500 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.5)]' :
                                                        canUnlock ? 'bg-slate-800 border-yellow-500 text-yellow-500' :
                                                        'bg-slate-800 border-slate-700 text-slate-600'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-bold text-base md:text-lg ${isUnlocked ? 'text-pink-400' : canUnlock ? 'text-white' : 'text-slate-500'}`}>{talent.name}</h3>
                                                        <p className="text-slate-400 text-xs md:text-sm">{talent.desc}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto pl-[60px] sm:pl-0">
                                                    <button
                                                        onClick={() => handleBuyTalent(talent, 'gold')}
                                                        disabled={isUnlocked || !canUnlock || !canAfford}
                                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold transition-colors text-sm md:text-base ${
                                                            isUnlocked ? 'bg-pink-900/50 text-pink-500 border border-pink-800' :
                                                            canUnlock && canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' :
                                                            'bg-slate-800 text-slate-600 border border-slate-700'
                                                        }`}
                                                    >
                                                        {isUnlocked ? 'UNLOCKED' : `🪙 ${talent.cost}`}
                                                    </button>
                                                    {!isUnlocked && (
                                                        <button
                                                            onClick={() => handleBuyTalent(talent, 'token')}
                                                            disabled={!canUnlock || (save.cosmicTokens || 0) < Math.max(1, Math.floor(talent.cost / 4))}
                                                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold transition-colors text-sm md:text-base ${
                                                                canUnlock && (save.cosmicTokens || 0) >= Math.max(1, Math.floor(talent.cost / 4)) ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                                                                'bg-slate-800 text-slate-600 border border-slate-700'
                                                            }`}
                                                        >
                                                            💠 {Math.max(1, Math.floor(talent.cost / 4))}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}