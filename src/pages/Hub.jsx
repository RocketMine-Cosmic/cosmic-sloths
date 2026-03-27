import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, ARENAS } from '../game/Constants';
import { Coffee, Shield, Zap, Heart, Magnet, ArrowRight } from 'lucide-react';

const UPGRADE_COSTS = [100, 250, 500, 1000, 2000];

export default function Hub() {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const [selectedChar, setSelectedChar] = useState('neobyte');
    const [selectedArena, setSelectedArena] = useState('station');
    const [activeTab, setActiveTab] = useState('deploy');

    const handleBuyUpgrade = (stat) => {
        const currentLevel = save.permanentUpgrades[stat];
        if (currentLevel >= UPGRADE_COSTS.length) return;
        
        const cost = UPGRADE_COSTS[currentLevel];
        if (save.gold >= cost) {
            const newSave = { ...save, gold: save.gold - cost };
            newSave.permanentUpgrades[stat]++;
            SaveManager.save(newSave);
            setSave(newSave);
        }
    };

    const handleBuyCharacter = (char) => {
        if (save.gold >= char.cost && !save.unlockedCharacters.includes(char.id)) {
            const newSave = { 
                ...save, 
                gold: save.gold - char.cost,
                unlockedCharacters: [...save.unlockedCharacters, char.id]
            };
            SaveManager.save(newSave);
            setSave(newSave);
            setSelectedChar(char.id);
        }
    };

    const startGame = () => {
        navigate('/game', { state: { characterId: selectedChar, arenaId: selectedArena } });
    };

    const renderUpgrades = () => {
        const stats = [
            { id: 'damage', name: 'Muscle Mass (Damage)', icon: Zap },
            { id: 'health', name: 'Thick Fur (Max HP)', icon: Heart },
            { id: 'speed', name: 'Morning Coffee (Speed)', icon: Coffee },
            { id: 'magnet', name: 'Gravity Boots (Pickup)', icon: Magnet },
            { id: 'regen', name: 'Photosynthesis (Regen)', icon: Shield }
        ];

        return (
            <div className="space-y-4">
                {stats.map(stat => {
                    const level = save.permanentUpgrades[stat.id];
                    const cost = UPGRADE_COSTS[level];
                    const isMax = level >= UPGRADE_COSTS.length;
                    const canAfford = save.gold >= cost;
                    const Icon = stat.icon;

                    return (
                        <div key={stat.id} className="bg-slate-800 p-4 rounded-lg flex items-center justify-between border border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-700 rounded-lg text-cyan-400">
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">{stat.name}</h3>
                                    <div className="flex gap-1 mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className={`w-4 h-4 rounded-sm ${i < level ? 'bg-cyan-500' : 'bg-slate-600'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleBuyUpgrade(stat.id)}
                                disabled={isMax || !canAfford}
                                className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                                    isMax ? 'bg-slate-700 text-slate-500' :
                                    canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' :
                                    'bg-slate-700 text-slate-400 border border-slate-600'
                                }`}
                            >
                                {isMax ? 'MAX' : `🪙 ${cost}`}
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderCharacters = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHARACTERS.map(char => {
                const isUnlocked = save.unlockedCharacters.includes(char.id);
                const isSelected = selectedChar === char.id;
                const canAfford = save.gold >= char.cost;

                return (
                    <div 
                        key={char.id} 
                        className={`bg-slate-800 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-slate-700 hover:border-slate-500'
                        }`}
                        onClick={() => isUnlocked && setSelectedChar(char.id)}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: char.color }}>
                                <span className="text-2xl">🦥</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-white">{char.name}</h3>
                                <p className="text-slate-400 text-sm">{char.desc}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mb-4 bg-slate-900 p-2 rounded">
                            <div className="text-slate-300">HP: <span className="text-white">{char.hp}</span></div>
                            <div className="text-slate-300">SPD: <span className="text-white">{char.speed}</span></div>
                            <div className="text-slate-300">ARM: <span className="text-white">{char.armor}</span></div>
                            <div className="text-slate-300">REG: <span className="text-white">{char.regen}</span></div>
                        </div>

                        {!isUnlocked && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleBuyCharacter(char); }}
                                disabled={!canAfford}
                                className={`w-full py-2 rounded-lg font-bold ${
                                    canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-500'
                                }`}
                            >
                                🪙 {char.cost} to Unlock
                            </button>
                        )}
                        {isUnlocked && (
                            <div className="text-center text-cyan-400 font-bold py-2">
                                {isSelected ? 'SELECTED' : 'Click to Select'}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono">
            <div className="max-w-5xl mx-auto">
                <header className="flex justify-between items-end mb-8 border-b border-slate-800 pb-4">
                    <div>
                        <h1 className="text-4xl font-bold text-cyan-400 tracking-tight">SLOTH LOUNGE</h1>
                        <p className="text-slate-400 mt-1">Rest, upgrade, and prepare for the cosmic void.</p>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400 bg-slate-900 px-6 py-3 rounded-xl border border-slate-700 shadow-lg">
                        🪙 {save.gold}
                    </div>
                </header>

                <div className="flex gap-8">
                    <div className="w-64 space-y-2">
                        <button 
                            onClick={() => setActiveTab('deploy')}
                            className={`w-full text-left px-6 py-4 rounded-lg font-bold text-lg transition-colors ${activeTab === 'deploy' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            🚀 Deploy
                        </button>
                        <button 
                            onClick={() => setActiveTab('upgrades')}
                            className={`w-full text-left px-6 py-4 rounded-lg font-bold text-lg transition-colors ${activeTab === 'upgrades' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            ⚙️ Upgrades
                        </button>
                        <button 
                            onClick={() => setActiveTab('characters')}
                            className={`w-full text-left px-6 py-4 rounded-lg font-bold text-lg transition-colors ${activeTab === 'characters' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            🦥 Crew
                        </button>
                    </div>

                    <div className="flex-1 bg-slate-900 rounded-2xl p-8 border border-slate-800 min-h-[600px]">
                        {activeTab === 'upgrades' && renderUpgrades()}
                        {activeTab === 'characters' && renderCharacters()}
                        {activeTab === 'deploy' && (
                            <div className="h-full flex flex-col justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-6">Mission Briefing</h2>
                                    
                                    <div className="mb-8">
                                        <h3 className="text-slate-400 mb-2">Selected Operative</h3>
                                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full" style={{ backgroundColor: CHARACTERS.find(c => c.id === selectedChar)?.color }}></div>
                                            <span className="text-xl font-bold text-white">{CHARACTERS.find(c => c.id === selectedChar)?.name}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-slate-400 mb-2">Select Arena</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {ARENAS.map(arena => (
                                                <button
                                                    key={arena.id}
                                                    onClick={() => setSelectedArena(arena.id)}
                                                    className={`p-4 rounded-lg border text-left transition-all ${
                                                        selectedArena === arena.id 
                                                        ? 'bg-slate-800 border-cyan-500 text-cyan-400' 
                                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                                    }`}
                                                >
                                                    <span className="font-bold text-lg">{arena.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={startGame}
                                    className="w-full mt-8 bg-cyan-600 hover:bg-cyan-500 text-white text-2xl font-bold py-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                                >
                                    LAUNCH MISSION <ArrowRight size={28} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}