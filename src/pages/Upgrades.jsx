import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS, CHARACTER_TALENTS, WEAPONS, TRAIL_COSMETICS, KILL_COSMETICS, SKIN_COSMETICS, RELICS, RELIC_RARITIES } from '../game/Constants';
import { Zap, Timer, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, Coins, Puzzle } from 'lucide-react';

function OmenXIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="OMENX" />;
}
import { useCurrency } from '@/lib/CurrencyContext';
import { useOmenXConfirmation } from '@/hooks/useOmenXConfirmation';
import OmenXConfirmation from '../components/game/OmenXConfirmation';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { getStatSku, getWeaponSku, getTalentSku, getCosmeticSku } from '@/lib/skuMap';
import { SoundManager } from '../game/SoundManager';
import CosmeticPreview from '../components/game/CosmeticPreview';
import ForgePanel from '../components/game/ForgePanel';
import StatPips, { SmallStatPips } from '../components/game/StatPips';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import OmenXGate from '../components/game/OmenXGate';

const UPGRADE_TYPES = [
    { id: 'permanent', name: 'Permanent', goldCosts: [1000, 2000, 4000, 8000, 16000], tokenCosts: [15, 30, 60, 120, 240] },
    { id: 'weekly', name: 'Weekly', goldCosts: [500, 1000, 2000, 4000, 8000], tokenCosts: [4, 8, 15, 30, 60] },
    { id: 'seasonal', name: 'Seasonal', goldCosts: [1500, 3000, 6000, 12000, 24000], tokenCosts: [10, 20, 40, 80, 160] }
];

const STATS = [
    { id: 'damage', name: 'Plasma Output', label: 'Damage', emoji: '⚡', perm: '+2%', week: '+5%', season: '+10%' },
    { id: 'health', name: 'Hull Integrity', label: 'Max HP', emoji: '❤️', perm: '+5', week: '+10', season: '+20' },
    { id: 'speed', name: 'Thruster Speed', label: 'Move Speed', emoji: '💨', perm: '+2%', week: '+5%', season: '+10%' },
    { id: 'magnet', name: 'Tractor Range', label: 'Pickup Range', emoji: '🔵', perm: '+5', week: '+15', season: '+30' },
    { id: 'regen', name: 'Nano-Repair', label: 'HP Regen/s', emoji: '🛡️', perm: '+0.1', week: '+0.2', season: '+0.5' },
    { id: 'cooldown', name: 'System Cooling', label: 'Cooldown', emoji: '⏱️', perm: '-2%', week: '-5%', season: '-10%' },
    { id: 'luck', name: 'Cosmic Fortune', label: 'Luck', emoji: '✨', perm: '+1', week: '+2', season: '+3' }
];



export default function Upgrades({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const { omenxBalance } = useCurrency();
    const { pending, setPending, confirm: confirmPurchase } = useOmenXConfirmation('upgrades-page');

    React.useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        
        const handleBeforeUnload = () => {
            SaveManager.syncToBackendImmediate();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('saveUpdated', handleSaveUpdated);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const [activeCategory, setActiveCategory] = useState('permanent');
    const [subCategory, setSubCategory] = useState('stats');
    const [selectedChar, setSelectedChar] = useState((save.unlockedCharacters && save.unlockedCharacters.length > 0) ? save.unlockedCharacters[0] : 'neobyte');
    const [selectedWeapon, setSelectedWeapon] = useState('napBeam');
    const [timeLeft, setTimeLeft] = useState('');
    const [purchasing, setPurchasing] = useState(false);
    const [cosmeticTab, setCosmeticTab] = useState('trail'); // 'trail', 'kill', or 'skin'
    const [skinCharIndex, setSkinCharIndex] = useState(0);
    const [previewSkinColor, setPreviewSkinColor] = useState(null); // color being previewed (not yet purchased)

    useEffect(() => {
        const updateTimer = () => {
            if (activeCategory === 'weekly') {
                const endOfWeek = moment().endOf('week');
                const duration = moment.duration(endOfWeek.diff(moment()));
                setTimeLeft(`${Math.floor(duration.asDays())}d ${duration.hours()}h ${duration.minutes()}m`);
            } else if (activeCategory === 'seasonal') {
                const weekNum = moment().week();
                const seasonNum = Math.floor(weekNum / 4) + 1;
                const lastWeekOfSeason = seasonNum * 4 - 1;
                const endOfSeason = moment().week(lastWeekOfSeason).endOf('week');
                const duration = moment.duration(endOfSeason.diff(moment()));
                setTimeLeft(`${Math.floor(duration.asDays())}d ${duration.hours()}h ${duration.minutes()}m`);
            } else {
                setTimeLeft('');
            }
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [activeCategory]);

    const purchaseSku = async (skuId) => {
        if (!skuId) { console.warn('[purchaseSku] No SKU mapping found — purchase skipped'); return { success: true, skipped: true }; }
        const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
        const walletAddress = authData?.walletAddress;
        if (!walletAddress) { console.warn('[purchaseSku] No wallet address found'); return { success: false, error: 'No wallet' }; }
        const res = await base44.functions.invoke('purchaseSku', { skuId, quantity: 1, walletAddress, userId: walletAddress, playerName: authData?.username || walletAddress, accessToken: authData?.accessToken });
        if (!res.data?.success) throw new Error(res.data?.error || 'Purchase failed');
        return res.data;
    };

    const syncSaveToBackend = async (updatedSave) => {
        try {
            const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
            if (!authData?.walletAddress || !authData?.accessToken) return;
            await base44.functions.invoke('syncSave', { walletAddress: authData.walletAddress, saveData: updatedSave, accessToken: authData.accessToken });
        } catch (e) {
            console.error('[syncSaveToBackend] Sync failed:', e);
        }
    };

    const purchaseWithConfirmation = (amount, itemName, onConfirm) => {
        confirmPurchase(amount, itemName, onConfirm);
    };

    const handleBuyStat = (stat, currency) => {
        const currentSave = SaveManager.load();
        const typeConfig = UPGRADE_TYPES.find(t => t.id === activeCategory);
        const saveKey = activeCategory === 'permanent' ? 'permanentUpgrades' : activeCategory === 'weekly' ? 'weeklyUpgrades' : 'seasonalUpgrades';
        const upgrades = currentSave[saveKey] || {};
        const currentLevel = upgrades[stat] || 0;
        
        if (currentLevel >= typeConfig.goldCosts.length) return;
        
        const goldCost = typeConfig.goldCosts[currentLevel];
        const tokenCost = typeConfig.tokenCosts[currentLevel];

        if (currency === 'gold' && currentSave.gold >= goldCost) {
            currentSave.gold -= goldCost;
            currentSave[saveKey] = { ...upgrades, [stat]: currentLevel + 1 };
            SaveManager.save(currentSave);
            setSave(currentSave);
            SoundManager.playUIClick();
        } else if (currency === 'token' && (omenxBalance ?? 0) >= tokenCost) {
            setPurchasing(true);
            purchaseSku(getStatSku(activeCategory, stat, currentLevel + 1)).then(() => {
                const s = SaveManager.load();
                const upg = s[saveKey] || {};
                s[saveKey] = { ...upg, [stat]: (upg[stat] || 0) + 1 };
                SaveManager.save(s);
                setSave(s);
                SaveManager.syncToBackendImmediate();
                SoundManager.playUIClick();
            }).catch(err => console.error('[handleBuyStat] purchase failed:', err))
              .finally(() => setPurchasing(false));
        }
    };

    const handleBuyWeapon = (weaponId, stat, currency) => {
        const currentSave = SaveManager.load();
        const typeConfig = UPGRADE_TYPES.find(t => t.id === activeCategory);
        const saveKey = activeCategory === 'permanent' ? 'permanentWeaponUpgrades' : activeCategory === 'weekly' ? 'weeklyWeaponUpgrades' : 'seasonalWeaponUpgrades';
        
        const weaponData = currentSave[saveKey]?.[weaponId] || {};
        const currentLevel = weaponData[stat] || 0;
        
        if (currentLevel >= typeConfig.goldCosts.length) return;
        
        const goldCost = typeConfig.goldCosts[currentLevel];
        const tokenCost = typeConfig.tokenCosts[currentLevel];
        
        if (currency === 'gold' && currentSave.gold >= goldCost) {
            currentSave.gold -= goldCost;
            if (!currentSave[saveKey]) currentSave[saveKey] = {};
            if (!currentSave[saveKey][weaponId]) currentSave[saveKey][weaponId] = {};
            currentSave[saveKey][weaponId][stat] = currentLevel + 1;
            SaveManager.save(currentSave);
            setSave(currentSave);
            SoundManager.playUIClick();
        } else if (currency === 'token' && (omenxBalance ?? 0) >= tokenCost) {
            const weaponObj = Object.values(WEAPONS).find(w => w.id === weaponId);
            setPurchasing(true);
            purchaseSku(getWeaponSku(activeCategory, weaponObj?.name || weaponId, stat, currentLevel + 1)).then(() => {
                const s = SaveManager.load();
                if (!s[saveKey]) s[saveKey] = {};
                if (!s[saveKey][weaponId]) s[saveKey][weaponId] = {};
                s[saveKey][weaponId][stat] = (s[saveKey][weaponId][stat] || 0) + 1;
                SaveManager.save(s);
                setSave(s);
                SaveManager.syncToBackendImmediate();
                SoundManager.playUIClick();
            }).catch(err => console.error('[handleBuyWeapon] purchase failed:', err))
              .finally(() => setPurchasing(false));
        }
    };

    const handleBuyTalent = (talent, currency) => {
        const currentSave = SaveManager.load();
        const typeConfig = UPGRADE_TYPES.find(t => t.id === activeCategory);
        const saveKey = activeCategory === 'permanent' ? 'permanentTalents' : activeCategory === 'weekly' ? 'weeklyTalents' : 'seasonalTalents';
        
        const unlocked = currentSave[saveKey]?.[selectedChar] || [];
        if (unlocked.includes(talent.id)) return;
        
        const costTier = (talent.tier - 1) * 2;
        const goldCost = typeConfig.goldCosts[costTier];
        const tokenCost = typeConfig.tokenCosts[costTier];

        if (currency === 'gold' && currentSave.gold >= goldCost) {
            currentSave.gold -= goldCost;
            if (!currentSave[saveKey]) currentSave[saveKey] = {};
            if (!currentSave[saveKey][selectedChar]) currentSave[saveKey][selectedChar] = [];
            currentSave[saveKey][selectedChar].push(talent.id);
            SaveManager.save(currentSave);
            setSave(currentSave);
            SoundManager.playUIClick();
        } else if (currency === 'token' && (omenxBalance ?? 0) >= tokenCost) {
            const charObj = CHARACTERS.find(c => c.id === selectedChar);
            setPurchasing(true);
            purchaseSku(getTalentSku(activeCategory, charObj?.name || selectedChar, talent.name, talent.tier)).then(() => {
                const s = SaveManager.load();
                if (!s[saveKey]) s[saveKey] = {};
                if (!s[saveKey][selectedChar]) s[saveKey][selectedChar] = [];
                s[saveKey][selectedChar].push(talent.id);
                SaveManager.save(s);
                setSave(s);
                SaveManager.syncToBackendImmediate();
                SoundManager.playUIClick();
            }).catch(err => console.error('[handleBuyTalent] purchase failed:', err))
              .finally(() => setPurchasing(false));
        }
    };

    const handleBuyRelic = (relic) => {
        const currentSave = SaveManager.load();
        const unlocked = currentSave.unlockedRelics || [];
        const relicLevels = currentSave.relicLevels || {};
        const isOwned = unlocked.includes(relic.id);
        const currentLevel = isOwned ? (relicLevels[relic.id] || 1) : 0;
        
        if (currentLevel >= 5) return;
        
        const costMultiplier = currentLevel === 0 ? 1 : Math.pow(2, currentLevel);
        const cost = relic.fragmentCost * costMultiplier;

        if ((currentSave.relicFragments || 0) >= cost) {
            currentSave.relicFragments -= cost;
            
            if (!isOwned) {
                currentSave.unlockedRelics = [...unlocked, relic.id];
                relicLevels[relic.id] = 1;
            } else {
                relicLevels[relic.id] = currentLevel + 1;
            }
            
            currentSave.relicLevels = relicLevels;
            SaveManager.save(currentSave);
            setSave(currentSave);
            SoundManager.playLevelUp();
        }
    };

    const handleToggleRelic = (relicId) => {
        const currentSave = SaveManager.load();
        let equipped = currentSave.equippedRelics || [];
        if (equipped.includes(relicId)) {
            equipped = equipped.filter(id => id !== relicId);
        } else if (equipped.length < 2) {
            equipped.push(relicId);
        } else {
            return;
        }
        currentSave.equippedRelics = equipped;
        SaveManager.save(currentSave);
        setSave(currentSave);
        SoundManager.playUIClick();
    };

    const handleBuyCosmetic = (cosmetic, slot, currency) => {
        // slot: 'trail', 'kill', or 'skin'
        if (slot === 'skin') {
            const unlocked = save.unlockedSkins || [];
            const isOwned = unlocked.includes(cosmetic.id) || cosmetic.goldCost === 0;
            const cosmetics = save.cosmetics || {};
            const charSkins = cosmetics.skins || {};

            if (currency === 'preview') {
                setPreviewSkinColor(skin => skin === cosmetic.color ? null : cosmetic.color);
                SoundManager.playUIClick();
                return;
            }
            if (isOwned) {
                const newSave = { ...save, cosmetics: { ...cosmetics, skins: { ...charSkins, [cosmetic.charId]: cosmetic.id } } };
                SaveManager.save(newSave);
                setSave(newSave);
                SoundManager.playUIClick();
                return;
            }
            if (currency === 'gold' && save.gold >= cosmetic.goldCost) {
                const newSave = { ...save, gold: save.gold - cosmetic.goldCost, unlockedSkins: [...unlocked, cosmetic.id] };
                newSave.cosmetics = { ...cosmetics, skins: { ...charSkins, [cosmetic.charId]: cosmetic.id } };
                SaveManager.save(newSave);
                setSave(newSave);
                SoundManager.playUIClick();
            } else if (currency === 'token' && (omenxBalance ?? 0) >= cosmetic.tokenCost) {
                setPurchasing(true);
                purchaseSku(getCosmeticSku('skin', cosmetic.name, cosmetic.goldCost)).then(() => {
                    const s = SaveManager.load();
                    const unl = s.unlockedSkins || [];
                    const cos = s.cosmetics || {};
                    s.unlockedSkins = [...unl, cosmetic.id];
                    s.cosmetics = { ...cos, skins: { ...(cos.skins || {}), [cosmetic.charId]: cosmetic.id } };
                    SaveManager.save(s);
                    setSave(s);
                    SaveManager.syncToBackendImmediate();
                    SoundManager.playUIClick();
                }).catch(err => console.error('[handleBuyCosmetic skin] purchase failed:', err))
                  .finally(() => setPurchasing(false));
            }
            return;
        }

        const unlockKey = slot === 'trail' ? 'unlockedCosmetics' : 'unlockedKillEffects';
        const freeId = slot === 'trail' ? 'default' : 'none';
        const unlocked = save[unlockKey] || [freeId];
        const cosmetics = save.cosmetics || { trail: 'default', killEffect: 'none' };
        const cosmeticKey = slot === 'trail' ? 'trail' : 'killEffect';

        // Preview: equip temporarily without purchasing (only updates local state, not save)
        if (currency === 'preview') {
            setSave(prev => ({ ...prev, cosmetics: { ...prev.cosmetics, [cosmeticKey]: cosmetic.id } }));
            SoundManager.playUIClick();
            return;
        }

        if (unlocked.includes(cosmetic.id)) {
            const newSave = { ...save, cosmetics: { ...cosmetics, [cosmeticKey]: cosmetic.id } };
            SaveManager.save(newSave);
            setSave(newSave);
            SoundManager.playUIClick();
            return;
        }

        if (currency === 'gold' && save.gold >= cosmetic.goldCost) {
            const newSave = { ...save, gold: save.gold - cosmetic.goldCost };
            newSave[unlockKey] = [...unlocked, cosmetic.id];
            newSave.cosmetics = { ...cosmetics, [cosmeticKey]: cosmetic.id };
            SaveManager.save(newSave);
            setSave(newSave);
            SoundManager.playUIClick();
        } else if (currency === 'token' && (omenxBalance ?? 0) >= cosmetic.tokenCost) {
            setPurchasing(true);
            purchaseSku(getCosmeticSku(slot, cosmetic.name, cosmetic.goldCost)).then(() => {
                const s = SaveManager.load();
                const unl = s[unlockKey] || [freeId];
                const cos = s.cosmetics || {};
                s[unlockKey] = [...unl, cosmetic.id];
                s.cosmetics = { ...cos, [cosmeticKey]: cosmetic.id };
                SaveManager.save(s);
                setSave(s);
                SaveManager.syncToBackendImmediate();
                SoundManager.playUIClick();
            }).catch(err => console.error('[handleBuyCosmetic trail/kill] purchase failed:', err))
              .finally(() => setPurchasing(false));
        }
    };

    const renderStats = () => {
        const typeConfig = UPGRADE_TYPES.find(t => t.id === activeCategory);
        if (!typeConfig || !typeConfig.goldCosts || !typeConfig.tokenCosts) return null;
        const saveKey = activeCategory === 'permanent' ? 'permanentUpgrades' : activeCategory === 'weekly' ? 'weeklyUpgrades' : 'seasonalUpgrades';
        const upgradesObj = save[saveKey] || {};
        
        return (
            <div className="space-y-2 md:space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-4">Base Stats</h2>
                {STATS.filter(Boolean).map(stat => {
                    const upgrades = upgradesObj;
                    const level = upgrades[stat.id] || 0;
                    const isMax = level >= typeConfig.goldCosts.length;
                    
                    const goldCost = isMax ? 0 : typeConfig.goldCosts[level];
                                    const tokenCost = isMax ? 0 : typeConfig.tokenCosts[level];

                                    const canAffordGold = save.gold >= goldCost;
                                    const canAffordToken = (omenxBalance ?? 0) >= tokenCost;

                                    return (
                                        <div key={stat.id} className="bg-slate-800 p-1.5 md:p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-4 border border-slate-700">
                                            <div className="flex items-center gap-2 md:gap-4">
                                                <div className="p-1.5 md:p-3 bg-slate-700 rounded-md md:rounded-lg text-cyan-400 shrink-0 text-base md:text-xl">
                                                    {stat.emoji}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm md:text-lg text-white">{stat.name} <span className="text-slate-400 font-normal text-xs md:text-sm">({stat.label})</span></h3>
                                                    <div className="text-[10px] md:text-xs text-slate-400 mb-0.5 md:mb-1">
                                                        {activeCategory === 'permanent' && `${stat.perm} per level`}
                                                        {activeCategory === 'weekly' && `${stat.week} per level`}
                                                        {activeCategory === 'seasonal' && `${stat.season} per level`}
                                                    </div>
                                                    <StatPips level={level} statId={stat.id} />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={() => handleBuyStat(stat.id, 'gold')}
                                                    disabled={isMax || !canAffordGold}
                                                    className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg font-bold transition-colors text-sm md:text-base flex items-center justify-center gap-1.5 ${
                                                        isMax ? 'bg-slate-700 text-slate-500' :
                                                        canAffordGold ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' :
                                                        'bg-slate-700 text-slate-400 border border-slate-600'
                                                    }`}
                                                >
                                                    {isMax ? 'MAX' : <><Coins className="w-4 h-4 fill-current" /> {goldCost.toLocaleString()} Gold</>}
                                                </button>
                                                {!isMax && (
                                                    <div className="flex items-center justify-center text-slate-500 text-xs font-bold sm:hidden md:flex">OR</div>
                                                )}
                                                {!isMax && (
                                                    <button
                                                       onClick={() => purchaseWithConfirmation(tokenCost, `${stat.name} Upgrade`, () => handleBuyStat(stat.id, 'token'))}
                                                       disabled={!canAffordToken || purchasing}
                                                       className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg font-bold transition-colors text-sm md:text-base flex items-center justify-center gap-1.5 ${
                                                           canAffordToken && !purchasing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                                                           'bg-slate-700 text-slate-400 border border-slate-600'
                                                       }`}
                                                    >
                                                       {purchasing ? '…' : <><OmenXIcon className="w-5 h-5" /> {tokenCost.toLocaleString()} OMENX</>}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                })}
            </div>
        );
    };

    const renderArmory = () => {
        const baseWeapons = Object.values(WEAPONS).filter(w => !w.isSynergy);
        const upgradeTypes = [
            { id: 'damage', name: 'Plasma Output', icon: Zap, desc: '+10% per level' },
            { id: 'area', name: 'Blast Radius', icon: Sparkles, desc: '+10% per level' },
            { id: 'cooldown', name: 'Cooling Rate', icon: Timer, desc: '-5% per level' }
        ];
        
        const typeConfig = UPGRADE_TYPES.find(t => t.id === activeCategory);
        if (!typeConfig) return null;
        const saveKey = activeCategory === 'permanent' ? 'permanentWeaponUpgrades' : activeCategory === 'weekly' ? 'weeklyWeaponUpgrades' : 'seasonalWeaponUpgrades';

        const weapon = baseWeapons.find(w => w.id === selectedWeapon) || baseWeapons[0];
        
        const getWeaponUpgrade = (wId, stat) => {
            const perm = save.permanentWeaponUpgrades?.[wId]?.[stat] || 0;
            const week = save.weeklyWeaponUpgrades?.[wId]?.[stat] || 0;
            const season = save.seasonalWeaponUpgrades?.[wId]?.[stat] || 0;
            return perm + week + season;
        };
        const dmgLevel = getWeaponUpgrade(weapon.id, 'damage');
        const areaLevel = getWeaponUpgrade(weapon.id, 'area');
        const cdLevel = getWeaponUpgrade(weapon.id, 'cooldown');
        const isMastered = dmgLevel >= 5 && areaLevel >= 5 && cdLevel >= 5;

        const currentIndex = baseWeapons.findIndex(w => w.id === selectedWeapon);
        const handlePrevWeapon = () => {
            SoundManager.playUIClick();
            const newIndex = currentIndex > 0 ? currentIndex - 1 : baseWeapons.length - 1;
            setSelectedWeapon(baseWeapons[newIndex].id);
        };
        const handleNextWeapon = () => {
            SoundManager.playUIClick();
            const newIndex = currentIndex < baseWeapons.length - 1 ? currentIndex + 1 : 0;
            setSelectedWeapon(baseWeapons[newIndex].id);
        };

        return (
            <div className="space-y-2 md:space-y-4">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-4">Armory</h2>
                
                <div className="flex items-center justify-between bg-slate-800 p-1.5 md:p-2 rounded-xl mb-2 md:mb-4 border border-slate-700">
                    <button 
                        onClick={handlePrevWeapon}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center font-bold text-cyan-400 text-lg">
                        {weapon.name}
                        <div className="text-xs text-slate-500 font-normal mt-0.5">
                            {currentIndex + 1} / {baseWeapons.length}
                        </div>
                    </div>
                    <button 
                        onClick={handleNextWeapon}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
                
                <div className={`bg-slate-800 p-2 md:p-4 rounded-xl border ${isMastered ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-slate-700'}`}>
                    <div className="mb-2 md:mb-4">
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
                            const level = save[saveKey]?.[weapon.id]?.[stat.id] || 0;
                            const isMax = level >= typeConfig.goldCosts.length;
                            const cost = isMax ? 0 : (typeConfig.goldCosts[level] || 0);
                            const tokenCost = isMax ? 0 : (typeConfig.tokenCosts[level] || 0);
                            const canAffordGold = save.gold >= cost;
                            const canAffordToken = (omenxBalance ?? 0) >= tokenCost;
                            const Icon = stat.icon;

                            return (
                                <div key={stat.id} className="bg-slate-900 p-2 md:p-3 rounded-lg border border-slate-700 flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-2 md:mb-3">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Icon size={16} className="text-cyan-400" />
                                            <div>
                                                <div className="font-bold text-xs md:text-sm leading-tight">{stat.name}</div>
                                                <div className="text-[10px] text-slate-500 leading-tight">{stat.desc}</div>
                                            </div>
                                        </div>
                                        <SmallStatPips level={level} statId={stat.id} />
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => handleBuyWeapon(weapon.id, stat.id, 'gold')}
                                            disabled={isMax || !canAffordGold}
                                            className={`flex-1 py-1.5 rounded font-bold transition-colors text-xs flex items-center justify-center gap-1 ${
                                                isMax ? 'bg-slate-800 text-slate-600' :
                                                canAffordGold ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' :
                                                'bg-slate-800 text-slate-500 border border-slate-700'
                                            }`}
                                        >
                                            {isMax ? 'MAX' : <><Coins className="w-3 h-3 fill-current" /> {cost.toLocaleString()} Gold</>}
                                        </button>
                                        {!isMax && (
                                            <button
                                                onClick={() => handleBuyWeapon(weapon.id, stat.id, 'token')}
                                                disabled={!canAffordToken || purchasing}
                                                className={`flex-1 py-1.5 rounded font-bold transition-colors text-xs flex items-center justify-center gap-1 ${
                                                    canAffordToken && !purchasing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                                                    'bg-slate-800 text-slate-500 border border-slate-700'
                                                }`}
                                            >
                                                {purchasing ? '…' : <><OmenXIcon className="w-4 h-4" /> {tokenCost.toLocaleString()} OMENX</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderTalents = () => {
        const typeConfig = UPGRADE_TYPES.find(t => t.id === activeCategory);
        if (!typeConfig) return null;
        const saveKey = activeCategory === 'permanent' ? 'permanentTalents' : activeCategory === 'weekly' ? 'weeklyTalents' : 'seasonalTalents';

        const unlockedChars = save.unlockedCharacters || ['neobyte'];
        const currentCharIndex = unlockedChars.indexOf(selectedChar) !== -1 ? unlockedChars.indexOf(selectedChar) : 0;
        const currentCharData = CHARACTERS.find(c => c.id === unlockedChars[currentCharIndex]) || CHARACTERS[0];
        
        const handlePrevChar = () => {
            SoundManager.playUIClick();
            const newIndex = currentCharIndex > 0 ? currentCharIndex - 1 : unlockedChars.length - 1;
            setSelectedChar(unlockedChars[newIndex]);
        };
        const handleNextChar = () => {
            SoundManager.playUIClick();
            const newIndex = currentCharIndex < unlockedChars.length - 1 ? currentCharIndex + 1 : 0;
            setSelectedChar(unlockedChars[newIndex]);
        };

        const handleRespecTalents = () => {
            const unlocked = save[saveKey]?.[selectedChar] || [];
            if (unlocked.length === 0) return;
            
            let refundedGold = 0;
            const charTalents = CHARACTER_TALENTS[selectedChar] || [];
            
            unlocked.forEach(tId => {
                const talent = charTalents.find(t => t.id === tId);
                if (talent) {
                    const costTier = (talent.tier - 1) * 2;
                    refundedGold += typeConfig.goldCosts[costTier];
                }
            });
            
            const newSave = { ...save, gold: save.gold + refundedGold };
            if (newSave[saveKey]) {
                newSave[saveKey][selectedChar] = [];
            }
            SaveManager.save(newSave);
            setSave(newSave);
            SoundManager.playUIClick();
        };

        return (
            <div>
                <div className="flex items-center justify-between mb-2 md:mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white">Skill Tree</h2>
                    <button 
                        onClick={handleRespecTalents}
                        disabled={(save[saveKey]?.[selectedChar] || []).length === 0}
                        className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/80 text-red-400 border border-red-800 rounded-lg font-bold text-xs md:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Respec (Refunds Gold)
                    </button>
                </div>
                
                <div className="flex items-center justify-between bg-slate-800 p-1.5 md:p-2 rounded-xl mb-4 border border-slate-700">
                    <button 
                        onClick={handlePrevChar}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-pink-500 overflow-hidden shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                            {currentCharData.image ? <img src={currentCharData.image} alt={currentCharData.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800" />}
                        </div>
                        <div className="text-center font-bold text-pink-400 text-lg">
                            {currentCharData.name}
                            <div className="text-xs text-slate-500 font-normal mt-0.5">
                                {currentCharIndex + 1} / {unlockedChars.length}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleNextChar}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-2 md:space-y-4 relative">
                    <div className="absolute left-[26px] md:left-[46px] top-8 bottom-8 w-1 bg-slate-800 z-0"></div>
                    
                    {(CHARACTER_TALENTS[selectedChar || 'neobyte'] || []).map((talent, index) => {
                        const unlocked = save[saveKey]?.[selectedChar || 'neobyte'] || [];
                        const isUnlocked = unlocked.includes(talent.id);
                        
                        // To unlock tier 2, you need tier 1 from ANY category (perm, week, season)
                        const getUnlockedTalents = (char) => {
                            const perm = save.permanentTalents?.[char] || [];
                            const week = save.weeklyTalents?.[char] || [];
                            const season = save.seasonalTalents?.[char] || [];
                            return [...new Set([...perm, ...week, ...season])];
                        };
                        const allUnlocked = getUnlockedTalents(selectedChar || 'neobyte');
                        
                        const canUnlock = !isUnlocked && (
                            talent.tier === 1 || 
                            (talent.requires && allUnlocked.includes(talent.requires) && (!talent.excludes || !allUnlocked.includes(talent.excludes)))
                        );
                        
                        const costTier = Math.min((talent.tier - 1) * 2, typeConfig.goldCosts.length - 1);
                        const goldCost = typeConfig.goldCosts[costTier] || 0;
                        const tokenCost = typeConfig.tokenCosts[costTier] || 0;
                        const canAffordGold = save.gold >= goldCost;
                        const canAffordToken = (omenxBalance ?? 0) >= tokenCost;
                        
                        // Determine branch visual
                        const isBranchA = talent.id.endsWith('a');
                        const isBranchB = talent.id.endsWith('b');
                        
                        return (
                            <div key={talent.id} className={`relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-4 bg-slate-900 p-2 md:p-4 rounded-lg md:rounded-xl border border-slate-700 ${isBranchA ? 'ml-0 sm:ml-8 border-l-4 border-l-blue-500' : isBranchB ? 'ml-0 sm:ml-8 border-l-4 border-l-purple-500' : ''}`}>
                                <div className="flex items-center gap-2 md:gap-4">
                                    <div className={`w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center shrink-0 border-2 md:border-4 ${
                                        isUnlocked ? 'bg-pink-900 border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]' :
                                        canUnlock ? 'bg-slate-800 border-yellow-500 text-yellow-500' :
                                        'bg-slate-800 border-slate-700 text-slate-600'
                                    }`}>
                                        {talent.tier}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-sm md:text-lg ${isUnlocked ? 'text-pink-400' : canUnlock ? 'text-white' : 'text-slate-500'}`}>
                                            {talent.name} {isBranchA ? '(Path A)' : isBranchB ? '(Path B)' : ''}
                                        </h3>
                                        <p className="text-slate-400 text-[10px] md:text-sm leading-tight">{talent.desc}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto pl-[60px] sm:pl-0">
                                    <button
                                        onClick={() => handleBuyTalent(talent, 'gold')}
                                        disabled={isUnlocked || !canUnlock || !canAffordGold}
                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold transition-colors text-sm md:text-base flex items-center justify-center gap-1.5 ${
                                            isUnlocked ? 'bg-pink-900/50 text-pink-500 border border-pink-800' :
                                            canUnlock && canAffordGold ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' :
                                            'bg-slate-800 text-slate-600 border border-slate-700'
                                        }`}
                                    >
                                        {isUnlocked ? 'UNLOCKED' : <><Coins className="w-4 h-4 fill-current" /> {goldCost.toLocaleString()} Gold</>}
                                    </button>
                                    {!isUnlocked && (
                                        <div className="flex items-center justify-center text-slate-500 text-xs font-bold sm:hidden md:flex">OR</div>
                                    )}
                                    {!isUnlocked && (
                                        <button
                                            onClick={() => handleBuyTalent(talent, 'token')}
                                            disabled={!canUnlock || !canAffordToken || purchasing}
                                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold transition-colors text-sm md:text-base flex items-center justify-center gap-1.5 ${
                                                canUnlock && canAffordToken && !purchasing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                                                'bg-slate-800 text-slate-600 border border-slate-700'
                                            }`}
                                        >
                                            {purchasing ? '…' : <><OmenXIcon className="w-5 h-5" /> {tokenCost.toLocaleString()} OMENX</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderRelics = () => {
        return (
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Ancient Relics</h2>
                <p className="text-slate-400 mb-6 text-sm">Equip powerful global artifacts. You can only equip up to 2 Relics at once. Upgrade them using Relic Fragments!</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RELICS.map(relic => {
                        const unlocked = save.unlockedRelics || [];
                        const equipped = save.equippedRelics || [];
                        const relicLevels = save.relicLevels || {};
                        const isOwned = unlocked.includes(relic.id);
                        const isEquipped = equipped.includes(relic.id);
                        const canEquipMore = equipped.length < 2;
                        const currentLevel = isOwned ? (relicLevels[relic.id] || 1) : 0;
                        const isMaxLevel = currentLevel >= 5;
                        
                        const costMultiplier = currentLevel === 0 ? 1 : Math.pow(2, currentLevel);
                        const cost = relic.fragmentCost * costMultiplier;
                        const canAfford = (save.relicFragments || 0) >= cost;
                        
                        const rarity = currentLevel > 0 ? RELIC_RARITIES[currentLevel - 1] : RELIC_RARITIES[0];
                        const nextRarity = !isMaxLevel ? RELIC_RARITIES[currentLevel] : null;
                        
                        const formatVal = (val) => {
                            if (relic.stat === 'luck' || relic.stat === 'regen') return `+${val.toFixed(1).replace('.0', '')}`;
                            return `+${Math.round(val * 100)}%`;
                        };
                        
                        const currentBuff = currentLevel > 0 ? formatVal(relic.values[currentLevel - 1]) : null;
                        const nextBuff = !isMaxLevel ? formatVal(relic.values[currentLevel]) : null;

                        return (
                            <div key={relic.id} className={`p-4 rounded-xl border-2 transition-all ${isEquipped ? `${rarity.border} ${rarity.glow} ${rarity.bg}` : isOwned ? `${rarity.border} bg-slate-800` : 'border-slate-700 bg-slate-800/50'}`}>
                                <div className="flex items-start gap-4 mb-2">
                                    <div className="text-3xl bg-slate-900 p-3 rounded-lg border border-slate-700 shrink-0">{relic.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between flex-wrap gap-2">
                                            <div>
                                                <h3 className={`text-lg font-bold truncate ${isOwned ? rarity.color : 'text-slate-400'}`}>{relic.name}</h3>
                                                {isOwned && (
                                                    <div className={`text-[10px] font-bold ${rarity.color} uppercase tracking-wider`}>
                                                        Lv.{currentLevel} {rarity.name} {isEquipped && ' • EQUIPPED'}
                                                    </div>
                                                )}
                                            </div>
                                            {isOwned && (
                                                <button 
                                                    onClick={() => handleToggleRelic(relic.id)}
                                                    disabled={!isEquipped && !canEquipMore}
                                                    className={`px-3 py-1 h-fit rounded-md font-bold text-xs transition-colors shrink-0 ${
                                                        isEquipped ? 'bg-slate-700 text-white hover:bg-slate-600' : 
                                                        canEquipMore ? 'bg-purple-600 hover:bg-purple-500 text-white' : 
                                                        'bg-slate-800 text-slate-500 border border-slate-700'
                                                    }`}
                                                >
                                                    {isEquipped ? 'UNEQUIP' : canEquipMore ? 'EQUIP' : 'SLOTS FULL'}
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-300 mt-2">{relic.desc}</p>
                                        
                                        <div className="mt-3 flex gap-1.5 flex-wrap">
                                            {relic.values.map((v, i) => {
                                                const lvlRarity = RELIC_RARITIES[i];
                                                const isCurrent = currentLevel === i + 1;
                                                const isUnlocked = currentLevel > i;
                                                return (
                                                    <div key={i} className={`text-[10px] px-1.5 py-0.5 rounded border flex flex-col items-center min-w-[36px] ${isCurrent ? `${lvlRarity.border} bg-slate-800 ${lvlRarity.color} font-bold shadow-[0_0_10px_currentColor]` : isUnlocked ? `border-slate-700 bg-slate-800/50 ${lvlRarity.color}` : 'border-slate-800/50 text-slate-600 bg-slate-900/50'}`} title={lvlRarity.name}>
                                                        <span className="opacity-70 text-[8px]">{lvlRarity.name.substring(0,3).toUpperCase()}</span>
                                                        <span>{formatVal(v)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 border-t border-slate-700/50 pt-4">
                                    {!isMaxLevel ? (
                                        <button 
                                            onClick={() => handleBuyRelic(relic)}
                                            disabled={!canAfford}
                                            className={`w-full py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                                                canAfford ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'bg-slate-900 text-slate-500 border border-slate-700'
                                            }`}
                                        >
                                            <span>{isOwned ? 'UPGRADE' : 'CRAFT'}</span>
                                            <span className="bg-slate-950/50 px-2 py-0.5 rounded border border-fuchsia-500/30 text-fuchsia-300 flex items-center gap-1"><Puzzle className="w-3 h-3 fill-current" /> {cost}</span>
                                        </button>
                                    ) : (
                                        <div className="w-full py-2 text-center text-yellow-500 font-bold text-sm bg-yellow-950/20 rounded-lg border border-yellow-500/30">
                                            MAXIMUM LEVEL REACHED
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    const renderCosmetics = () => {
        const isTrail = cosmeticTab === 'trail';
        const list = isTrail ? TRAIL_COSMETICS : KILL_COSMETICS;
        const unlockKey = isTrail ? 'unlockedCosmetics' : 'unlockedKillEffects';
        const freeId = isTrail ? 'default' : 'none';
        const equippedTrail = save.cosmetics?.trail || 'default';
        const equippedKill = save.cosmetics?.killEffect || 'none';

        // Preview uses currently equipped values (both tabs always visible in preview)
        const previewTrail = equippedTrail;
        const previewKill = equippedKill;

        return (
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Cosmetics</h2>

                {/* Live Preview — hidden on skins tab */}
                {cosmeticTab !== 'skin' && (
                    <div className="mb-4">
                        <CosmeticPreview 
                            trailId={previewTrail} 
                            killEffectId={previewKill}
                            charId={selectedChar}
                            playerColor={SKIN_COSMETICS.find(s => s.id === (save.cosmetics?.skins?.[selectedChar] || `${selectedChar}_default`))?.color || CHARACTERS.find(c => c.id === selectedChar)?.color || '#00cfff'}
                        />
                        <div className="flex gap-3 mt-2 text-xs text-slate-400 justify-center">
                            <span>Trail: <strong className="text-pink-400">{TRAIL_COSMETICS.find(t => t.id === equippedTrail)?.name}</strong></span>
                            <span>Kill Effect: <strong className="text-pink-400">{KILL_COSMETICS.find(k => k.id === equippedKill)?.name}</strong></span>
                        </div>
                    </div>
                )}

                {/* Tab switcher */}
                <div className="flex gap-2 mb-4 border-b border-slate-800 pb-2 flex-wrap">
                    <button
                        onClick={() => { SoundManager.playUIClick(); setCosmeticTab('trail'); setPreviewSkinColor(null); }}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${cosmeticTab === 'trail' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        ✨ Trails
                    </button>
                    <button
                        onClick={() => { SoundManager.playUIClick(); setCosmeticTab('kill'); setPreviewSkinColor(null); }}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${cosmeticTab === 'kill' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        💥 Kill Effects
                    </button>
                    <button
                        onClick={() => { SoundManager.playUIClick(); setCosmeticTab('skin'); }}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${cosmeticTab === 'skin' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        🎨 Character Skins
                    </button>
                </div>

                {cosmeticTab === 'skin' ? (() => {
                    const unlockedChars = save.unlockedCharacters || ['neobyte'];
                    const currentChar = CHARACTERS.find(c => c.id === unlockedChars[skinCharIndex % unlockedChars.length]) || CHARACTERS[0];
                    const charSkins = SKIN_COSMETICS.filter(s => s.charId === currentChar.id);
                    const equippedSkinId = save.cosmetics?.skins?.[currentChar.id] || `${currentChar.id}_default`;
                    const equippedSkin = SKIN_COSMETICS.find(s => s.id === equippedSkinId) || charSkins[0];
                    const displayColor = previewSkinColor || equippedSkin?.color || currentChar.color;
                    const unlockedSkins = save.unlockedSkins || [];

                    return (
                        <div>
                            {/* Skin color preview */}
                            <div className="mb-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                                <div className="relative shrink-0">
                                    <div className="w-16 h-16 rounded-full border-4 border-slate-600 overflow-hidden bg-slate-900 flex items-center justify-center shadow-lg"
                                        style={{ boxShadow: `0 0 20px ${displayColor}60` }}>
                                        {currentChar.image
                                            ? <img src={currentChar.image} alt={currentChar.name} className="w-full h-full object-cover" style={{ filter: `drop-shadow(0 0 6px ${displayColor})` }} />
                                            : <div className="w-10 h-10 rounded-full" style={{ background: displayColor }} />
                                        }
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800" style={{ background: displayColor }} />
                                </div>
                                <div>
                                    <div className="font-bold text-white text-sm">{currentChar.name}</div>
                                    {previewSkinColor
                                        ? <div className="text-xs text-amber-400 font-bold mt-0.5">👁 Previewing color</div>
                                        : <div className="text-xs text-pink-400 font-bold mt-0.5">Equipped: {equippedSkin?.name || 'Default'}</div>
                                    }
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-3 h-3 rounded-full border border-slate-600" style={{ background: displayColor }} />
                                        <span className="text-[10px] text-slate-500 font-mono">{displayColor}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Character selector */}
                            <div className="flex items-center justify-between bg-slate-800 p-2 rounded-xl mb-4 border border-slate-700">
                                <button onClick={() => { SoundManager.playUIClick(); setSkinCharIndex(i => (i - 1 + unlockedChars.length) % unlockedChars.length); setPreviewSkinColor(null); }}
                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-500" style={{ borderColor: currentChar.color }}>
                                        {currentChar.image ? <img src={currentChar.image} alt={currentChar.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800" />}
                                    </div>
                                    <div className="font-bold text-white">{currentChar.name}
                                        <div className="text-xs text-slate-500 font-normal">{skinCharIndex % unlockedChars.length + 1} / {unlockedChars.length}</div>
                                    </div>
                                </div>
                                <button onClick={() => { SoundManager.playUIClick(); setSkinCharIndex(i => (i + 1) % unlockedChars.length); setPreviewSkinColor(null); }}
                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                                {charSkins.map(skin => {
                                    const isOwned = skin.goldCost === 0 || unlockedSkins.includes(skin.id);
                                    const isEquipped = equippedSkinId === skin.id;
                                    const canAffordGold = save.gold >= skin.goldCost;
                                    const canAffordToken = (omenxBalance ?? 0) >= skin.tokenCost;
                                    return (
                                        <div key={skin.id} className={`bg-slate-800 p-3 rounded-xl border-2 flex flex-col gap-2 transition-all ${isEquipped ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-700 hover:border-slate-600'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full border-2 shrink-0" style={{ background: skin.color, borderColor: skin.color + '80' }} />
                                                <div>
                                                    <div className="font-bold text-sm text-white leading-tight">{skin.name}</div>
                                                    {isEquipped && <div className="text-[10px] text-pink-400 font-bold">EQUIPPED</div>}
                                                    {!isOwned && <div className="text-[10px] text-slate-500 font-bold">LOCKED</div>}
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-400 leading-snug">{skin.desc}</p>
                                            {isOwned ? (
                                                <button onClick={() => handleBuyCosmetic(skin, 'skin', 'gold')} disabled={isEquipped}
                                                    className={`w-full py-1.5 rounded-lg font-bold transition-colors text-xs ${isEquipped ? 'bg-pink-700 text-pink-200 cursor-default' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
                                                    {isEquipped ? '✓ EQUIPPED' : 'EQUIP'}
                                                </button>
                                            ) : (
                                                <div className="flex gap-1.5 w-full flex-col">
                                                    <button onClick={() => handleBuyCosmetic(skin, 'skin', 'preview')}
                                                       className={`w-full py-1 rounded-lg font-bold transition-colors text-xs ${previewSkinColor === skin.color ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                                       {previewSkinColor === skin.color ? '👁 Previewing' : '👁 Preview'}
                                                    </button>
                                                    {!skin.isSeasonalReward && (
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => handleBuyCosmetic(skin, 'skin', 'gold')} disabled={!canAffordGold}
                                                                className={`flex-1 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-1 ${canAffordGold ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}>
                                                                <Coins className="w-3 h-3 fill-current" /> {skin.goldCost.toLocaleString()} Gold
                                                            </button>
                                                            {skin.tokenCost > 0 && (
                                                                <button onClick={() => handleBuyCosmetic(skin, 'skin', 'token')} disabled={!canAffordToken}
                                                                        className={`flex-1 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-1 ${canAffordToken ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-900 text-slate-500 border border-slate-700'}`}>
                                                                        <OmenXIcon className="w-4 h-4" /> {skin.tokenCost.toLocaleString()} OMENX
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })() : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                    {list.map(cosmetic => {
                        const unlocked = save[unlockKey] || [freeId];
                        const isOwned = unlocked.includes(cosmetic.id);
                        const isEquipped = isTrail ? equippedTrail === cosmetic.id : equippedKill === cosmetic.id;
                        const canAffordGold = save.gold >= cosmetic.goldCost;
                        const canAffordToken = (omenxBalance ?? 0) >= cosmetic.tokenCost;

                        return (
                            <div key={cosmetic.id} className={`bg-slate-800 p-3 rounded-xl border-2 flex flex-col gap-2 transition-all ${isEquipped ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-700 hover:border-slate-600'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{cosmetic.icon}</span>
                                    <div>
                                        <div className="font-bold text-sm text-white leading-tight">{cosmetic.name}</div>
                                        {isEquipped && <div className="text-[10px] text-pink-400 font-bold">EQUIPPED</div>}
                                        {!isOwned && cosmetic.goldCost > 0 && <div className="text-[10px] text-slate-500 font-bold">LOCKED</div>}
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-snug">{cosmetic.desc}</p>

                                {isOwned ? (
                                    <button
                                        onClick={() => handleBuyCosmetic(cosmetic, cosmeticTab, 'gold')}
                                        disabled={isEquipped}
                                        className={`w-full py-1.5 rounded-lg font-bold transition-colors text-xs ${
                                            isEquipped ? 'bg-pink-700 text-pink-200 cursor-default' : 'bg-slate-700 text-white hover:bg-slate-600'
                                        }`}
                                    >
                                        {isEquipped ? '✓ EQUIPPED' : 'EQUIP'}
                                    </button>
                                ) : (
                                    <div className="flex gap-1.5 w-full flex-col">
                                        <button
                                            onClick={() => handleBuyCosmetic(cosmetic, cosmeticTab, 'preview')}
                                            className="w-full py-1 rounded-lg font-bold transition-colors text-xs bg-slate-700 text-slate-300 hover:bg-slate-600"
                                        >
                                            👁 Preview
                                        </button>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => handleBuyCosmetic(cosmetic, cosmeticTab, 'gold')}
                                                disabled={!canAffordGold}
                                                className={`flex-1 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-1 ${
                                                    canAffordGold ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-slate-900 text-slate-500 border border-slate-700'
                                                }`}
                                            >
                                                <Coins className="w-3 h-3 fill-current" /> {cosmetic.goldCost.toLocaleString()} Gold
                                            </button>
                                            {cosmetic.tokenCost > 0 && (
                                                <button
                                                    onClick={() => handleBuyCosmetic(cosmetic, cosmeticTab, 'token')}
                                                    disabled={!canAffordToken}
                                                    className={`flex-1 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-1 ${
                                                        canAffordToken ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-900 text-slate-500 border border-slate-700'
                                                    }`}
                                                >
                                                    <OmenXIcon className="w-3 h-3" /> {cosmetic.tokenCost.toLocaleString()} OMENX
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                )}
            </div>
        );
    };

    return (
        <OmenXGate isCarousel={isCarousel}>
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 p-2 pb-20 md:p-6 font-sans`}>
            {!isCarousel && <SpaceBackground />}
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
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest" style={{ background: 'linear-gradient(90deg, #D946EF, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(217,70,239,0.5))' }}>UPGRADE LOUNGE</h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">Enhance your operatives and arsenal.</p>
                    </div>
                    <CurrencyHeader />
                </header>

                <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
                    {UPGRADE_TYPES.map(type => (
                        <button
                            key={type.id}
                            onClick={() => { SoundManager.playUIClick(); setActiveCategory(type.id); }}
                            className={`px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-black tracking-widest uppercase text-xs md:text-sm transition-all ${
                                activeCategory === type.id 
                                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                                : 'bg-[#0b0416]/80 border border-slate-700/50 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-200'
                            }`}
                        >
                            {type.name}
                        </button>
                    ))}
                    <button
                        onClick={() => { SoundManager.playUIClick(); setActiveCategory('relics'); }}
                        className={`px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-black tracking-widest uppercase text-xs md:text-sm transition-all ${
                            activeCategory === 'relics' 
                            ? 'bg-purple-500/20 border border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                            : 'bg-[#0b0416]/80 border border-slate-700/50 text-slate-400 hover:border-purple-500/50 hover:text-purple-200'
                        }`}
                    >
                        💎 Relics
                    </button>
                    <button
                        onClick={() => { SoundManager.playUIClick(); setActiveCategory('forge'); }}
                        className={`px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-black tracking-widest uppercase text-xs md:text-sm transition-all ${
                            activeCategory === 'forge' 
                            ? 'bg-yellow-500/20 border border-yellow-400 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.3)]' 
                            : 'bg-[#0b0416]/80 border border-slate-700/50 text-slate-400 hover:border-yellow-500/50 hover:text-yellow-200'
                        }`}
                    >
                        🔨 Forge
                    </button>
                    <button
                        onClick={() => { SoundManager.playUIClick(); setActiveCategory('cosmetics'); }}
                        className={`px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-black tracking-widest uppercase text-xs md:text-sm transition-all ${
                            activeCategory === 'cosmetics' 
                            ? 'bg-pink-500/20 border border-pink-400 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                            : 'bg-[#0b0416]/80 border border-slate-700/50 text-slate-400 hover:border-pink-500/50 hover:text-pink-200'
                        }`}
                    >
                        Cosmetics
                    </button>
                </div>

                {timeLeft && (
                    <div className="mb-3 md:mb-4 text-xs md:text-sm font-bold text-cyan-400 bg-slate-800/50 p-1.5 md:p-2 rounded-md md:rounded-lg border border-slate-700 inline-block">
                        Resets in: {timeLeft}
                    </div>
                )}

                <div className="flex-1 bg-[#0b0416]/60 backdrop-blur-xl rounded-xl md:rounded-2xl p-2 md:p-6 border border-[#8B5CF6]/30 shadow-[0_0_50px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] min-h-[400px] md:min-h-[600px]">
                    {activeCategory === 'forge' ? (
                        <ForgePanel save={save} setSave={setSave} />
                    ) : activeCategory === 'relics' ? (
                        renderRelics()
                    ) : activeCategory !== 'cosmetics' ? (
                        <>
                            <div className="flex flex-wrap gap-2 mb-3 border-b border-slate-800 pb-2">
                                {['stats', 'armory', 'talents'].map(sub => (
                                    <button
                                        key={sub}
                                        onClick={() => { SoundManager.playUIClick(); setSubCategory(sub); }}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm md:text-base capitalize transition-colors whitespace-nowrap ${
                                            subCategory === sub ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                            {subCategory === 'stats' && renderStats()}
                            {subCategory === 'armory' && renderArmory()}
                            {subCategory === 'talents' && renderTalents()}
                        </>
                    ) : (
                        renderCosmetics()
                    )}
                    
                </div>
            </div>
            
            {pending && (
                <OmenXConfirmation
                    amount={pending.amount}
                    itemName={pending.itemName}
                    onConfirm={pending.onConfirm}
                    onCancel={pending.onCancel}
                    pageId="upgrades-page"
                />
            )}
        </div>
        </OmenXGate>
    );
}