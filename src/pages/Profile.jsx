import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { maskWallet } from '@/lib/maskWallet';
import { getOmenXUser, updateOmenXUser } from '@/lib/omenxUser';
import { Pencil, Check, X, ArrowLeft, Trophy, Crosshair, Users, Gift, Hexagon } from 'lucide-react';
import EmojiPicker, { PILOT_ICONS } from '../components/game/EmojiPicker';
import { SoundManager } from '../game/SoundManager';
import { SaveManager } from '../game/SaveManager';
import { useOmenXUser } from '@/hooks/useOmenXUser';
import { useOmenXVip } from '@/hooks/useOmenXVip';
import moment from 'moment';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import OmenXAuthButton from '../components/game/OmenXAuthButton';
import OmenXGate from '../components/game/OmenXGate';


export default function Profile({ isCarousel }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [stats, setStats] = useState({
        highestScore: 0,
        totalKills: 0,
        leviathanKills: 0,
        globalRaidDamage: 0,
    });
    const [squad, setSquad] = useState(null);
    const [rewardsHistory, setRewardsHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const { vip: vipLevel } = useOmenXVip();
    const { user: omenxUser } = useOmenXUser();

    useEffect(() => {
        const handleOmenXUserUpdated = (e) => {
            const updatedUser = {
                walletAddress: e.detail.walletAddress,
                username: e.detail.username,
                full_name: e.detail.player_name || e.detail.username || 'Player',
                player_name: e.detail.player_name || e.detail.username || 'Player',
                pilot_icon: e.detail.pilot_icon || '🦥',
                data: {
                    player_name: e.detail.player_name || e.detail.username || 'Player',
                    player_title: e.detail.player_title || '',
                    pilot_icon: e.detail.pilot_icon || '🦥',
                }
            };
            setUser(updatedUser);
            setNewName(updatedUser.player_name);
            setNewTitle(updatedUser.data.player_title);
        };
        window.addEventListener('omenxUserUpdated', handleOmenXUserUpdated);
        return () => window.removeEventListener('omenxUserUpdated', handleOmenXUserUpdated);
    }, []);

    useEffect(() => {
        if (!omenxUser) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                setUser(omenxUser);
                const displayName = omenxUser?.player_name || omenxUser?.data?.player_name || omenxUser?.full_name || 'Anonymous';
                setNewName(displayName);
                setNewTitle(omenxUser?.data?.player_title || '');

                if (omenxUser && omenxUser.walletAddress) {
                     // Fetch best score — use local cache (5 min TTL) to avoid a network round-trip on every visit
                     const SCORE_CACHE_KEY = `profile_top_score_${omenxUser.walletAddress}`;
                     const SCORE_CACHE_TTL = 5 * 60 * 1000;
                     let maxScore = 0;
                     try {
                         const cached = JSON.parse(localStorage.getItem(SCORE_CACHE_KEY));
                         if (cached && Date.now() - cached.ts < SCORE_CACHE_TTL) {
                             maxScore = cached.score;
                         } else {
                             const topScore = await base44.entities.RunScore.filter({ wallet_address: omenxUser.walletAddress }, '-score', 1);
                             maxScore = topScore.length > 0 ? topScore[0].score : 0;
                             localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify({ score: maxScore, ts: Date.now() }));
                         }
                     } catch {
                         const topScore = await base44.entities.RunScore.filter({ wallet_address: omenxUser.walletAddress }, '-score', 1);
                         maxScore = topScore.length > 0 ? topScore[0].score : 0;
                     }
                     const save = SaveManager.load();
                     const enemyKills = save.enemyKills || {};
                     const totalLeviathans = Object.keys(enemyKills)
                         .filter(id => id.startsWith('boss_') || id === 'world_boss')
                         .reduce((sum, id) => sum + (enemyKills[id] || 0), 0);
                     setStats({
                         highestScore: maxScore,
                         totalKills: save.totalKills || 0,
                         leviathanKills: totalLeviathans,
                         globalRaidDamage: 0
                     });
                     // Fetch rewards in parallel (no dependency on score)
                     base44.entities.PayoutLog.filter({ player_name: displayName }, '-period_id', 50)
                         .then(rewards => setRewardsHistory(rewards))
                         .catch(() => {});
                 }
                setLoading(false);
            } catch (e) {
                console.error('Failed to fetch profile data', e);
                setLoading(false);
            }
        })();

        const handleSaveUpdated = () => {
            setUser(prev => ({ ...prev }));
        };
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, [omenxUser]);

    const getAccessToken = () => {
        try { return JSON.parse(localStorage.getItem('omenx_auth_data'))?.accessToken || null; } catch { return null; }
    };

    const handleSaveIcon = async (icon) => {
        await updateOmenXUser({ pilot_icon: icon });
        setUser(prev => ({ ...prev, data: { ...prev?.data, pilot_icon: icon } }));
        // Sync to DB — include current name so the single function handles everything
        const accessToken = getAccessToken();
        if (accessToken) {
            const currentName = user?.player_name || user?.data?.player_name || '';
            base44.functions.invoke('syncProfileName', {
                newName: currentName,
                newIcon: icon,
                accessToken,
            }).catch(e => console.error('[Profile] icon sync failed', e));
        }
    };

    const handleSaveName = async () => {
        if (!newName.trim()) return;
        const updatedName = newName.trim();
        await updateOmenXUser({ player_name: updatedName });
        setUser(prev => ({ ...prev, player_name: updatedName, data: { ...prev?.data, player_name: updatedName } }));
        setIsEditingName(false);
        // Sync to DB
        const accessToken = getAccessToken();
        if (accessToken) {
            base44.functions.invoke('syncProfileName', {
                newName: updatedName,
                accessToken,
            }).catch(e => console.error('[Profile] name sync failed', e));
        }
    };

    const handleSaveTitle = async (title) => {
        await updateOmenXUser({ player_title: title });
        setUser(prev => ({ ...prev, data: { ...prev?.data, player_title: title } }));
        setNewTitle(title);
        setIsEditingTitle(false);
        // Sync to DB
        const accessToken = getAccessToken();
        const currentName = user?.player_name || user?.data?.player_name || '';
        if (accessToken && currentName) {
            base44.functions.invoke('syncProfileName', {
                newName: currentName,
                newTitle: title,
                accessToken,
            }).catch(e => console.error('[Profile] title sync failed', e));
        }
    };

    const getAvailableTitles = () => {
        const t = [{ id: '', label: 'No Title' }];
        
        const addTitle = (id, label) => {
            if (!t.some(existing => existing.id === id)) {
                t.push({ id, label });
            }
        };

        addTitle('Novice Pilot', 'Novice Pilot');
        
        const currentSave = SaveManager.load();
        const totalKills = currentSave.totalKills || 0;
        const maxTimeSurvived = currentSave.maxTimeSurvived || 0;
        const totalGoldEarned = currentSave.totalGoldEarned || 0;
        const maxLevelReached = currentSave.maxLevelReached || 0;
        const unlockedCharactersCount = currentSave.unlockedCharacters?.length || 0;
        const totalUnlockedCosmetics = currentSave.unlockedCosmetics?.length || 0;
        const totalUnlockedTalents = Object.values(currentSave.unlockedTalents || {}).reduce((acc, arr) => acc + arr.length, 0);

        // Original Profile Titles
        if (stats.totalKills >= 1000) addTitle('Vanguard', 'Vanguard');
        if (stats.totalKills >= 10000) addTitle('Void Walker', 'Void Walker');
        if (stats.highestScore >= 50000) addTitle('Top Survivor', 'Top Survivor');
        if (stats.highestScore >= 100000) addTitle('Cosmic Legend', 'Cosmic Legend');
        
        if (stats.leviathanKills >= 1) addTitle('Leviathan Slayer', 'Leviathan Slayer');
        if (stats.leviathanKills >= 10) addTitle('Apex Predator', 'Apex Predator');
        if (stats.globalRaidDamage >= 10000) addTitle('Raid Trooper', 'Raid Trooper');
        if (stats.globalRaidDamage >= 500000) addTitle('World Eater Bane', 'World Eater Bane');
        
        if (currentSave.gold >= 10000 || totalGoldEarned >= 100000) addTitle('Gold Hoarder', 'Gold Hoarder');
        if (maxLevelReached >= 20) addTitle('Ascendant', 'Ascendant');
        if (unlockedCharactersCount >= 5) addTitle('Commander', 'Commander');

        // Achievement Titles - Survival
        if (maxTimeSurvived >= 180) addTitle('Survivor', 'Survivor');
        if (maxTimeSurvived >= 240) addTitle('Veteran', 'Veteran');
        if (maxTimeSurvived >= 300) addTitle('Master', 'Master');
        if (maxTimeSurvived >= 360) addTitle('Cosmic Legend', 'Cosmic Legend'); // Note: Duplicate protected by addTitle logic
        if (maxTimeSurvived >= 420) addTitle('Time Lord', 'Time Lord');
        if (maxTimeSurvived >= 480) addTitle('Eternal', 'Eternal');
        if (maxTimeSurvived >= 600) addTitle('Immortal Sloth', 'Immortal Sloth');

        // Achievement Titles - Combat
        if (totalKills >= 100) addTitle('First Blood', 'First Blood');
        if (totalKills >= 1000) addTitle('Exterminator', 'Exterminator');
        if (totalKills >= 10000) addTitle('Cosmic Destroyer', 'Cosmic Destroyer');
        if (totalKills >= 50000) addTitle('Genocidal Sloth', 'Genocidal Sloth');
        if (totalKills >= 100000) addTitle('Sloth God', 'Sloth God');
        if (totalKills >= 250000) addTitle('Bringer of Extinction', 'Bringer of Extinction');

        // Achievement Titles - Wealth
        if (totalGoldEarned >= 10000) addTitle('Pocket Change', 'Pocket Change');
        if (totalGoldEarned >= 100000) addTitle('Filthy Rich', 'Filthy Rich');
        if (totalGoldEarned >= 1000000) addTitle('Billionaire', 'Billionaire');
        if (totalGoldEarned >= 5000000) addTitle('Sloth of Wall Street', 'Sloth of Wall Street');

        // Achievement Titles - Progression
        if (maxLevelReached >= 10) addTitle('Power Up', 'Power Up');
        if (maxLevelReached >= 20) addTitle('Ascended', 'Ascended'); // Duplicate protected
        if (maxLevelReached >= 30) addTitle('Beyond Limits', 'Beyond Limits');
        if (maxLevelReached >= 40) addTitle('God Tier', 'God Tier');
        if (maxLevelReached >= 50) addTitle('Maximum Overdrive', 'Maximum Overdrive');
        
        if (unlockedCharactersCount >= 5) addTitle('Growing Crew', 'Growing Crew');
        if (unlockedCharactersCount >= 10) addTitle('Completionist', 'Completionist');
        if (totalUnlockedCosmetics >= 6) addTitle('Fashionista', 'Fashionista');
        if (totalUnlockedTalents >= 15) addTitle('Skillful', 'Skillful');
        if (totalUnlockedTalents >= 30) addTitle('Omniscient', 'Omniscient');

        return t;
    };

    const getVipTierName = (level) => {
        const tiers = ['Bronze 1', 'Bronze 2', 'Silver 1', 'Silver 2', 'Silver 3', 'Gold 1', 'Gold 2', 'Platinum 1', 'Platinum 2', 'Platinum 3', 'Diamond 1', 'Diamond 2', 'Diamond 3', 'Diamond 4'];
        return tiers[level - 1] || `Level ${level}`;
    };

    const getVipTierColor = (level) => {
        if (level <= 2) return { text: 'text-amber-700', border: 'border-amber-600/50', bg: 'bg-amber-950/40', shadow: 'shadow-[0_0_20px_rgba(180,83,9,0.2)]' };
        if (level <= 5) return { text: 'text-slate-300', border: 'border-slate-400/50', bg: 'bg-slate-800/40', shadow: 'shadow-[0_0_20px_rgba(148,163,184,0.2)]' };
        if (level <= 7) return { text: 'text-yellow-400', border: 'border-yellow-600/50', bg: 'bg-yellow-950/40', shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.2)]' };
        if (level <= 10) return { text: 'text-cyan-300', border: 'border-cyan-500/50', bg: 'bg-cyan-950/40', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]' };
        return { text: 'text-blue-300', border: 'border-blue-400/50', bg: 'bg-blue-950/40', shadow: 'shadow-[0_0_20px_rgba(96,165,250,0.25)]' };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <OmenXGate isCarousel={isCarousel}>
        <div className={`${isCarousel ? 'h-full flex flex-col' : 'h-[100dvh] flex flex-col'} relative text-slate-200 p-2 pb-2 md:p-6 font-sans overflow-hidden`}>
            {!isCarousel && <SpaceBackground />}
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0 relative z-10">
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
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-2" style={{ background: 'linear-gradient(90deg, #0CA7B8, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(6,182,212,0.5))' }}>
                            PILOT PROFILE
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">View your career and statistics.</p>
                    </div>
                    <CurrencyHeader />
                </header>

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-4 md:space-y-6 flex-1 overflow-y-auto pr-1 pb-10"
                >
                    {/* Header / Name Edit */}
                    <div className="relative z-20 bg-[#0b0416]/60 backdrop-blur-xl border border-cyan-500/30 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-[0_0_30px_rgba(6,182,212,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="relative shrink-0">
                                <button
                                    onClick={() => setShowIconPicker(v => !v)}
                                    className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-xl md:text-2xl hover:border-cyan-300 transition-colors overflow-hidden"
                                    title="Change pilot icon"
                                >
                                    {(() => {
                                        const icon = user?.data?.pilot_icon || user?.pilot_icon || '🦥';
                                        return icon.startsWith('http') ? <img src={icon} className="w-full h-full object-cover" alt="pilot" /> : icon;
                                    })()}
                                </button>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-600 rounded-full flex items-center justify-center pointer-events-none">
                                    <Pencil size={10} className="text-white" />
                                </div>
                                {showIconPicker && (
                                    <EmojiPicker
                                        options={PILOT_ICONS}
                                        selected={user?.data?.pilot_icon || user?.pilot_icon || '🦥'}
                                        onSelect={handleSaveIcon}
                                        onClose={() => setShowIconPicker(false)}
                                    />
                                )}
                            </div>
                            <div>
                                <h1 className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Pilot Identity</h1>
                                {isEditingName ? (
                                    <div className="flex items-center gap-1.5 md:gap-2">
                                        <input 
                                            type="text" 
                                            value={newName} 
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="bg-slate-950 text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-cyan-500 outline-none text-base md:text-xl w-40 md:w-64 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                        />
                                        <button onClick={handleSaveName} className="p-2 bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded-lg transition-colors border border-green-500/30">
                                            <Check size={20} />
                                        </button>
                                        <button onClick={() => { setIsEditingName(false); setNewName(user?.player_name || user?.data?.player_name || user?.data?.full_name || user?.full_name || ''); }} className="p-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors border border-red-500/30">
                                            <X size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl md:text-3xl font-bold text-white">{user?.player_name || user?.data?.player_name || user?.data?.full_name || user?.full_name || 'Anonymous'}</span>
                                            <button onClick={() => setIsEditingName(true)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors border border-slate-700 hover:border-slate-500">
                                                <Pencil size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                    {isEditingTitle ? (
                                        <div className="flex items-center gap-2">
                                            <select 
                                                value={newTitle}
                                                onChange={(e) => handleSaveTitle(e.target.value)}
                                                className="bg-slate-900 border border-amber-500/50 text-amber-300 rounded px-2 py-1 text-xs outline-none focus:border-amber-400"
                                            >
                                                {getAvailableTitles().map(t => (
                                                    <option key={t.id} value={t.id}>{t.label}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => setIsEditingTitle(false)} className="text-slate-400 hover:text-white p-1">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                                            {user?.data?.player_title ? (
                                                <span className="text-[10px] bg-slate-900/80 text-amber-300 px-2 py-0.5 rounded border border-amber-900/50 tracking-wider font-bold">
                                                    {user.data.player_title}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-500 italic">No Title Equipped</span>
                                            )}
                                            <Pencil size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-center md:text-right">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Joined</div>
                            <div className="text-sm text-slate-300">{moment(user?.created_date).format('MMMM Do YYYY')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* Career Stats */}
                        <div className="bg-[#0b0416]/60 backdrop-blur-xl border border-cyan-500/30 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-center">
                            <h2 className="text-lg md:text-xl font-bold text-cyan-400 mb-4 md:mb-6 flex items-center gap-2">
                                <Trophy className="w-5 h-5" /> Career Highlights
                            </h2>
                            <div className="space-y-3 md:space-y-6">
                                <div className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-slate-700/50 flex items-center gap-3 md:gap-4">
                                    <div className="p-3 bg-orange-900/30 rounded-lg text-orange-400 border border-orange-500/30">
                                        <Crosshair className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-400 font-bold mb-1">Total Enemies Defeated</div>
                                        <div className="text-2xl font-mono font-bold text-white">{stats.totalKills.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-slate-700/50 flex items-center gap-3 md:gap-4">
                                    <div className="p-3 bg-cyan-900/30 rounded-lg text-cyan-400 border border-cyan-500/30">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-xs md:text-sm text-slate-400 font-bold mb-0.5 md:mb-1">Highest Score</div>
                                        <div className="text-xl md:text-2xl font-mono font-bold text-white">{stats.highestScore.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Squad Affiliation */}
                        <div className="bg-[#0b0416]/60 backdrop-blur-xl border border-orange-500/30 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                            <h2 className="text-lg md:text-xl font-bold text-orange-400 mb-4 md:mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5" /> Squad Affiliation
                            </h2>
                            {squad ? (
                                <div className="bg-slate-800/50 rounded-xl p-4 md:p-5 border border-orange-500/30 text-center">
                                    <div className="text-3xl md:text-4xl mb-2 md:mb-3 h-10 md:h-12 flex items-center justify-center">
                                        {(squad.icon || '🛡️').startsWith('http') ? <img src={squad.icon} className="h-full aspect-square rounded-md object-cover" alt="squad" /> : (squad.icon || '🛡️')}
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1">{squad.name}</h3>
                                    <div className="text-xs md:text-sm font-bold text-orange-400 bg-orange-950/50 px-2 py-1 rounded inline-block border border-orange-900 mb-2 md:mb-3">
                                        [{squad.tag}]
                                    </div>
                                    <p className="text-slate-400 text-xs md:text-sm mb-3 md:mb-4">{squad.description}</p>
                                    <button 
                                        onClick={() => { SoundManager.playUIClick(); navigate('/squads'); }}
                                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors w-full"
                                    >
                                        View Squad
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-slate-800/30 rounded-xl p-4 md:p-6 border border-slate-700/50 text-center h-[180px] md:h-[240px] flex flex-col items-center justify-center">
                                    <Users className="w-10 h-10 md:w-12 md:h-12 text-slate-600 mb-2 md:mb-3" />
                                    <div className="text-xs md:text-sm text-slate-400 mb-3 md:mb-4">You are not currently in a squad.</div>
                                    <button 
                                        onClick={() => { SoundManager.playUIClick(); navigate('/squads'); }}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                                    >
                                        Find a Squad
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* VIP Status */}
                    <div className="bg-[#0b0416]/60 backdrop-blur-xl border border-yellow-500/40 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                        <h2 className="text-lg md:text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                            ⭐ VIP Status
                        </h2>
                        {vipLevel > 0 ? (
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8">
                                <div className={`flex flex-col items-center justify-center ${getVipTierColor(vipLevel).bg} border ${getVipTierColor(vipLevel).border} rounded-xl px-8 py-4 ${getVipTierColor(vipLevel).shadow} shrink-0`}>
                                    <div className={`text-3xl md:text-4xl font-black font-mono ${getVipTierColor(vipLevel).text}`}>{getVipTierName(vipLevel)}</div>
                                    <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${getVipTierColor(vipLevel).text} opacity-60`}>VIP Tier</div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-slate-400 text-sm mb-3">Your VIP level grants permanent in-game bonuses applied to every run:</p>
                                    <div className="bg-slate-800/60 rounded-lg p-3 border border-yellow-900/50 flex items-center gap-3">
                                        <span className="text-2xl">⚡</span>
                                        <div>
                                            <div className="font-bold text-white text-sm">Damage Boost</div>
                                            <div className="text-yellow-400 font-mono font-bold">+{vipLevel}% flat damage multiplier</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/60 rounded-lg p-3 border border-yellow-900/50 flex items-center gap-3">
                                        <span className="text-2xl">❤️</span>
                                        <div>
                                            <div className="font-bold text-white text-sm">HP Boost</div>
                                            <div className="text-yellow-400 font-mono font-bold">+{vipLevel}% flat max HP bonus</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-500 text-sm">
                                No VIP level detected. Earn VIP status on OmenX to unlock in-game bonuses.
                            </div>
                        )}
                    </div>

                    {/* Rewards History */}
                    <div className="bg-[#0b0416]/60 backdrop-blur-xl border border-emerald-500/30 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                        <h2 className="text-lg md:text-xl font-bold text-emerald-400 mb-4 md:mb-6 flex items-center gap-2">
                            <Gift className="w-5 h-5" /> Rewards History
                        </h2>
                        
                        {rewardsHistory.length === 0 ? (
                            <div className="text-center text-sm md:text-base text-slate-500 py-6 md:py-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                No rewards claimed yet. Compete on the leaderboards to earn OMENX rewards!
                            </div>
                        ) : (
                            <div className="grid gap-2 md:gap-3 max-h-[200px] md:max-h-[300px] overflow-y-auto pr-2">
                                {rewardsHistory.map((reward) => (
                                    <div key={reward.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-white mb-1">{reward.reason}</div>
                                            <div className="text-xs text-slate-400">Period: {reward.period_id}</div>
                                        </div>
                                        <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                                            <Hexagon className="w-4 h-4 fill-emerald-400 text-emerald-400" /> +{reward.amount.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
        </OmenXGate>
    );
}