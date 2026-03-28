import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, ARENAS, CHARACTER_TALENTS, WEAPONS, DIFFICULTIES } from '../game/Constants';
import { Coffee, Shield, Zap, Heart, Magnet, ArrowRight, ArrowLeft, Timer, Sparkles, Crosshair, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import Leaderboard from '../components/game/Leaderboard';
import UpgradesTab from '../components/game/UpgradesTab';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';

const UPGRADE_COSTS = [500, 1000, 2000, 4000, 8000];

export default function Hub() {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const [selectedChar, setSelectedChar] = useState('neobyte');
    const [selectedArena, setSelectedArena] = useState('station');
    const [selectedDifficulty, setSelectedDifficulty] = useState('normal');
    const [activeTab, setActiveTab] = useState('deploy');
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

    const startGame = () => {
        SoundManager.playUIClick();
        navigate('/game', { state: { characterId: selectedChar, arenaId: selectedArena, difficultyId: selectedDifficulty } });
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



    const renderCharacters = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {CHARACTERS.map(char => {
                const isUnlocked = save.unlockedCharacters.includes(char.id);
                const isSelected = selectedChar === char.id;
                const canAfford = save.gold >= char.cost;
                const isFindable = ['glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte'].includes(char.id);

                return (
                    <div 
                        key={char.id} 
                        className={`bg-slate-800 p-3 md:p-4 rounded-lg border-2 transition-all cursor-pointer flex flex-col h-full ${
                            isSelected ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-slate-700 hover:border-slate-500'
                        }`}
                        onClick={() => isUnlocked && setSelectedChar(char.id)}
                    >
                        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 border-slate-600 bg-slate-900" style={{ borderColor: char.color }}>
                                {char.image ? (
                                    <img src={char.image} alt={char.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                    <span className="text-xl md:text-2xl">🦥</span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg md:text-xl text-white leading-tight">{char.name}</h3>
                                <p className="text-slate-400 text-xs md:text-sm mt-1">{char.desc}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 md:gap-2 text-xs md:text-sm mb-3 md:mb-4 bg-slate-900 p-2 rounded mt-auto">
                            <div className="text-slate-300">HP: <span className="text-white">{char.hp}</span></div>
                            <div className="text-slate-300">SPD: <span className="text-white">{char.speed}</span></div>
                            <div className="text-slate-300">ARM: <span className="text-white">{char.armor}</span></div>
                            <div className="text-slate-300">REG: <span className="text-white">{char.regen}</span></div>
                        </div>

                        {!isUnlocked && !isFindable && (
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleBuyCharacter(char, 'gold'); }}
                                    disabled={!canAfford}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm md:text-base ${
                                        canAfford ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-500'
                                    }`}
                                >
                                    🪙 {char.cost}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleBuyCharacter(char, 'token'); }}
                                    disabled={(save.cosmicTokens || 0) < Math.max(1, Math.floor(char.cost / 4))}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm md:text-base ${
                                        (save.cosmicTokens || 0) >= Math.max(1, Math.floor(char.cost / 4)) ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'
                                    }`}
                                >
                                    💠 {Math.max(1, Math.floor(char.cost / 4))}
                                </button>
                            </div>
                        )}
                        {!isUnlocked && isFindable && (
                            <div className="w-full py-2 rounded-lg font-bold text-sm md:text-base bg-slate-700 text-slate-400 text-center border border-slate-600">
                                🔍 Find in Maps
                            </div>
                        )}
                        {isUnlocked && (
                            <div className="text-center text-cyan-400 font-bold py-2 text-sm md:text-base">
                                {isSelected ? 'SELECTED' : 'Click to Select'}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 pb-24 md:p-8 font-mono">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 border-b border-slate-800 pb-4">
                    <div>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" /> Main Menu
                        </button>
                        <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 tracking-tight">SLOTH LOUNGE</h1>
                        <p className="text-slate-400 mt-1 text-sm md:text-base">Rest, upgrade, and prepare for the cosmic void.</p>
                    </div>
                    <div className="flex gap-2 md:gap-4">
                        <div className="text-xl md:text-2xl font-bold text-purple-400 bg-slate-900 px-4 md:px-6 py-2 md:py-3 rounded-xl border border-slate-700 shadow-lg" title="Reroll Tokens">
                            🎲 {save.rerollTokens || 0}
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-emerald-400 bg-slate-900 px-4 md:px-6 py-2 md:py-3 rounded-xl border border-slate-700 shadow-lg" title="Cosmic Tokens (Crypto)">
                            💠 {save.cosmicTokens || 0}
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-yellow-400 bg-slate-900 px-4 md:px-6 py-2 md:py-3 rounded-xl border border-slate-700 shadow-lg" title="Gold">
                            🪙 {save.gold}
                        </div>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-64 grid grid-cols-2 sm:grid-cols-5 md:flex md:flex-col gap-2 pb-2 md:pb-0">
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('deploy'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'deploy' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            🚀 Deploy
                        </button>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('upgrades'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'upgrades' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            ⚙️ Upgrades
                        </button>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('characters'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'characters' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            🦥 Crew
                        </button>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('talents'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'talents' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            🧬 Skill Tree
                        </button>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('armory'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'armory' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            ⚔️ Armory
                        </button>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); setActiveTab('leaderboard'); }}
                            className={`text-center md:text-left px-2 md:px-6 py-2 md:py-4 rounded-lg font-bold text-xs sm:text-sm md:text-lg transition-colors ${activeTab === 'leaderboard' ? 'bg-cyan-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}
                        >
                            🏆 Leaderboard
                        </button>
                    </div>

                    <div className="flex-1 bg-slate-900 rounded-2xl p-4 md:p-8 border border-slate-800 min-h-[500px] md:min-h-[600px]">
                        {activeTab === 'upgrades' && <UpgradesTab save={save} setSave={setSave} SaveManager={SaveManager} />}
                        {activeTab === 'armory' && renderArmory()}
                        {activeTab === 'characters' && renderCharacters()}
                        {activeTab === 'leaderboard' && <Leaderboard />}
                        {activeTab === 'talents' && (
                            <div>
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
                                                        isUnlocked ? 'bg-cyan-900 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' :
                                                        canUnlock ? 'bg-slate-800 border-yellow-500 text-yellow-500' :
                                                        'bg-slate-800 border-slate-700 text-slate-600'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-bold text-base md:text-lg ${isUnlocked ? 'text-cyan-400' : canUnlock ? 'text-white' : 'text-slate-500'}`}>{talent.name}</h3>
                                                        <p className="text-slate-400 text-xs md:text-sm">{talent.desc}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto pl-[60px] sm:pl-0">
                                                    <button
                                                        onClick={() => handleBuyTalent(talent, 'gold')}
                                                        disabled={isUnlocked || !canUnlock || !canAfford}
                                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold transition-colors text-sm md:text-base ${
                                                            isUnlocked ? 'bg-cyan-900/50 text-cyan-500 border border-cyan-800' :
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
                        {activeTab === 'deploy' && (
                            <div className="h-full flex flex-col justify-between">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Mission Briefing</h2>
                                    
                                    <div className="mb-6 md:mb-8">
                                        <h3 className="text-sm md:text-base text-slate-400 mb-2">Selected Operative</h3>
                                        <div className="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-700 flex items-center gap-3 md:gap-4">
                                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full shrink-0 overflow-hidden border-2 border-slate-600 bg-slate-900" style={{ borderColor: CHARACTERS.find(c => c.id === selectedChar)?.color }}>
                                                {CHARACTERS.find(c => c.id === selectedChar)?.image ? (
                                                    <img src={CHARACTERS.find(c => c.id === selectedChar)?.image} alt="Selected" className="w-full h-full object-cover object-top" />
                                                ) : (
                                                    <div className="w-full h-full" style={{ backgroundColor: CHARACTERS.find(c => c.id === selectedChar)?.color }}></div>
                                                )}
                                            </div>
                                            <span className="text-lg md:text-xl font-bold text-white">{CHARACTERS.find(c => c.id === selectedChar)?.name}</span>
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
                                        <div 
                                            className="relative bg-slate-800 rounded-xl border border-purple-500 overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.3)] select-none touch-pan-y"
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
                                                    <h4 className="text-xl md:text-2xl font-bold text-purple-400 mb-1 drop-shadow-md">
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
                                    </div>
                                </div>

                                <button
                                    onClick={startGame}
                                    disabled={!(save.unlockedArenasByCharacter[selectedChar] || ['station']).includes(selectedArena)}
                                    className={`w-full mt-6 md:mt-8 text-white text-xl md:text-2xl font-bold py-4 md:py-6 rounded-xl flex items-center justify-center gap-2 md:gap-3 transition-all transform ${
                                        (save.unlockedArenasByCharacter[selectedChar] || ['station']).includes(selectedArena)
                                        ? 'bg-cyan-600 hover:bg-cyan-500 hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    {(save.unlockedArenasByCharacter[selectedChar] || ['station']).includes(selectedArena) ? (
                                        <>LAUNCH MISSION <ArrowRight className="w-6 h-6 md:w-7 md:h-7" /></>
                                    ) : (
                                        <>ARENA LOCKED</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}