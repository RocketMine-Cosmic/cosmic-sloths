import React, { useState } from 'react';
import { Coffee, Shield, Zap, Heart, Magnet, Timer, Sparkles } from 'lucide-react';

const UPGRADE_TYPES = [
    { id: 'permanent', name: 'Permanent (Weak)', currency: 'gold', costs: [500, 1000, 2000, 4000, 8000] },
    { id: 'weekly', name: 'Weekly (Medium)', currency: 'gold', costs: [100, 250, 500, 1000, 2000] },
    { id: 'seasonal', name: 'Seasonal (Strong)', currency: 'token', costs: [5, 10, 20, 40, 80] }
];

const STATS = [
    { id: 'damage', name: 'Damage', icon: Zap },
    { id: 'health', name: 'Max HP', icon: Heart },
    { id: 'speed', name: 'Speed', icon: Coffee },
    { id: 'magnet', name: 'Pickup', icon: Magnet },
    { id: 'regen', name: 'Regen', icon: Shield },
    { id: 'cooldown', name: 'Cooldown', icon: Timer },
    { id: 'luck', name: 'Luck', icon: Sparkles }
];

const COSMETICS = [
    { id: 'default', name: 'None', cost: 0, currency: 'gold', icon: '⚪' },
    { id: 'fire', name: 'Fire Trail', cost: 5000, currency: 'gold', icon: '🔥' },
    { id: 'ice', name: 'Ice Trail', cost: 5000, currency: 'gold', icon: '❄️' },
    { id: 'toxic', name: 'Toxic Trail', cost: 5000, currency: 'gold', icon: '🧪' },
    { id: 'void', name: 'Void Trail', cost: 20, currency: 'token', icon: '🌌' },
    { id: 'gold', name: 'Golden Trail', cost: 50, currency: 'token', icon: '✨' }
];

export default function UpgradesTab({ save, setSave, SaveManager }) {
    const [activeCategory, setActiveCategory] = useState('permanent');

    const handleBuyUpgrade = (stat, type) => {
        const typeConfig = UPGRADE_TYPES.find(t => t.id === type);
        const saveKey = type === 'permanent' ? 'permanentUpgrades' : type === 'weekly' ? 'weeklyUpgrades' : 'seasonalUpgrades';
        const upgrades = save[saveKey] || {};
        const currentLevel = upgrades[stat] || 0;
        
        if (currentLevel >= typeConfig.costs.length) return;
        
        const cost = typeConfig.costs[currentLevel];

        if (typeConfig.currency === 'gold' && save.gold >= cost) {
            const newSave = { ...save, gold: save.gold - cost };
            newSave[saveKey] = { ...upgrades, [stat]: currentLevel + 1 };
            SaveManager.save(newSave);
            setSave(newSave);
        } else if (typeConfig.currency === 'token' && (save.cosmicTokens || 0) >= cost) {
            const newSave = { ...save, cosmicTokens: (save.cosmicTokens || 0) - cost };
            newSave[saveKey] = { ...upgrades, [stat]: currentLevel + 1 };
            SaveManager.save(newSave);
            setSave(newSave);
        }
    };

    const handleBuyCosmetic = (cosmetic) => {
        const unlocked = save.unlockedCosmetics || ['default'];
        const cosmetics = save.cosmetics || { trail: 'default' };

        if (unlocked.includes(cosmetic.id)) {
            const newSave = { ...save, cosmetics: { ...cosmetics, trail: cosmetic.id } };
            SaveManager.save(newSave);
            setSave(newSave);
            return;
        }

        if (cosmetic.currency === 'gold' && save.gold >= cosmetic.cost) {
            const newSave = { ...save, gold: save.gold - cosmetic.cost };
            newSave.unlockedCosmetics = [...unlocked, cosmetic.id];
            newSave.cosmetics = { ...cosmetics, trail: cosmetic.id };
            SaveManager.save(newSave);
            setSave(newSave);
        } else if (cosmetic.currency === 'token' && (save.cosmicTokens || 0) >= cosmetic.cost) {
            const newSave = { ...save, cosmicTokens: (save.cosmicTokens || 0) - cosmetic.cost };
            newSave.unlockedCosmetics = [...unlocked, cosmetic.id];
            newSave.cosmetics = { ...cosmetics, trail: cosmetic.id };
            SaveManager.save(newSave);
            setSave(newSave);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-wrap gap-2 mb-6">
                {UPGRADE_TYPES.map(type => (
                    <button
                        key={type.id}
                        onClick={() => setActiveCategory(type.id)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${
                            activeCategory === type.id ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                        {type.name}
                    </button>
                ))}
                <button
                    onClick={() => setActiveCategory('cosmetics')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${
                        activeCategory === 'cosmetics' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                    Cosmetics
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 md:space-y-4">
                {activeCategory !== 'cosmetics' ? (
                    STATS.map(stat => {
                        const typeConfig = UPGRADE_TYPES.find(t => t.id === activeCategory);
                        const saveKey = activeCategory === 'permanent' ? 'permanentUpgrades' : activeCategory === 'weekly' ? 'weeklyUpgrades' : 'seasonalUpgrades';
                        const upgrades = save[saveKey] || {};
                        const level = upgrades[stat.id] || 0;
                        const cost = typeConfig.costs[level];
                        const isMax = level >= typeConfig.costs.length;
                        
                        const canAfford = typeConfig.currency === 'gold' ? save.gold >= cost : (save.cosmicTokens || 0) >= cost;
                        const Icon = stat.icon;

                        return (
                            <div key={stat.id} className="bg-slate-800 p-3 md:p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 border border-slate-700">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="p-2 md:p-3 bg-slate-700 rounded-lg text-cyan-400 shrink-0">
                                        <Icon size={20} className="md:w-6 md:h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base md:text-lg text-white">{stat.name}</h3>
                                        <div className="flex gap-1 mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${i < level ? 'bg-cyan-500' : 'bg-slate-600'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleBuyUpgrade(stat.id, activeCategory)}
                                        disabled={isMax || !canAfford}
                                        className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg font-bold transition-colors text-sm md:text-base ${
                                            isMax ? 'bg-slate-700 text-slate-500' :
                                            canAfford ? (typeConfig.currency === 'gold' ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-emerald-600 hover:bg-emerald-500 text-white') :
                                            'bg-slate-700 text-slate-400 border border-slate-600'
                                        }`}
                                    >
                                        {isMax ? 'MAX' : `${typeConfig.currency === 'gold' ? '🪙' : '💠'} ${cost}`}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {COSMETICS.map(cosmetic => {
                            const unlocked = save.unlockedCosmetics || ['default'];
                            const isUnlocked = unlocked.includes(cosmetic.id);
                            const isEquipped = save.cosmetics?.trail === cosmetic.id;
                            const canAfford = cosmetic.currency === 'gold' ? save.gold >= cosmetic.cost : (save.cosmicTokens || 0) >= cosmetic.cost;

                            return (
                                <div key={cosmetic.id} className={`bg-slate-800 p-4 rounded-lg border-2 flex flex-col items-center text-center gap-3 ${isEquipped ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-700'}`}>
                                    <div className="text-4xl">{cosmetic.icon}</div>
                                    <h3 className="font-bold text-lg text-white">{cosmetic.name}</h3>
                                    
                                    <button
                                        onClick={() => handleBuyCosmetic(cosmetic)}
                                        disabled={(!isUnlocked && !canAfford) || isEquipped}
                                        className={`w-full py-2 rounded-lg font-bold transition-colors text-sm ${
                                            isEquipped ? 'bg-pink-600 text-white' :
                                            isUnlocked ? 'bg-slate-700 text-white hover:bg-slate-600' :
                                            canAfford ? (cosmetic.currency === 'gold' ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-emerald-600 hover:bg-emerald-500 text-white') :
                                            'bg-slate-800 text-slate-500 border border-slate-700'
                                        }`}
                                    >
                                        {isEquipped ? 'EQUIPPED' : 
                                         isUnlocked ? 'EQUIP' : 
                                         `${cosmetic.currency === 'gold' ? '🪙' : '💠'} ${cosmetic.cost}`}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}