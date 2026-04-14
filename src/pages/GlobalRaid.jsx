import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { ArrowLeft, Skull, Crosshair, Trophy, Activity, Zap, Hexagon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';
import BossPreview from '../components/game/BossPreview';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import { CHARACTERS } from '../game/Constants';

export default function GlobalRaid({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());

    React.useEffect(() => {
        const handleSaveUpdated = (e) => setSave(e.detail);
        window.addEventListener('saveUpdated', handleSaveUpdated);
        return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
    }, []);

    const { toast } = useToast();
    
    const [worldBossData, setWorldBossData] = useState(null);
    const [worldBossContribution, setWorldBossContribution] = useState(null);
    const [topContributors, setTopContributors] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);
    const [claimingLevel, setClaimingLevel] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [activeTab, setActiveTab] = useState('raid');
    const [selectedChar, setSelectedChar] = useState(save.lastSelectedChar || 'neobyte');

    useEffect(() => {
        if (selectedChar !== save.lastSelectedChar) {
            const newSave = { ...save, lastSelectedChar: selectedChar };
            SaveManager.save(newSave);
            setSave(newSave);
        }
    }, [selectedChar, save]);

    useEffect(() => {
        const updateTimer = () => {
            const endOfWeek = moment().endOf('week');
            const duration = moment.duration(endOfWeek.diff(moment()));
            setTimeLeft(`${Math.floor(duration.asDays())}d ${duration.hours()}h ${duration.minutes()}m`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchBoss = async () => {
            try {
                const user = await base44.auth.me();
                if (!user) return;
                const week_id = moment().format('YYYY-[W]ww');
                const res = await base44.functions.invoke('getOrSpawnWeeklyBoss', { week_id });
                if (res.data.boss) {
                    setWorldBossData(res.data.boss);
                    const contribs = await base44.entities.GlobalBossContribution.filter({ week_id, user_id: user.id });
                    if (contribs.length > 0) setWorldBossContribution(contribs[0]);
                    
                    const allContribs = await base44.entities.GlobalBossContribution.filter({ week_id }, '-damage', 10);
                    setTopContributors(allContribs);

                    const events = await base44.entities.GlobalBossEvent.filter({ week_id }, '-created_date', 15);
                    setRecentEvents(events);
                }
            } catch (e) { console.error('Failed to fetch world boss', e); }
        };
        fetchBoss();
    }, []);

    const handleClaimBossReward = async (level) => {
        if (!worldBossData || claimingLevel !== null) return;
        setClaimingLevel(level);
        try {
            const week_id = moment().format('YYYY-[W]ww');
            const res = await base44.functions.invoke('claimBossReward', { week_id, claim_level: level });
            if (res.data.status === 'success') {
                const { type, id } = res.data.reward;
                const currentSave = SaveManager.load();
                
                if (type === 'gold') {
                    const amount = parseInt(id, 10) || 10000;
                    currentSave.gold = (currentSave.gold || 0) + amount;
                    setSave(currentSave);
                    toast({ title: `Level ${level} Reward Claimed!`, description: `Received ${amount.toLocaleString()} Gold!` });
                }
                SaveManager.save(currentSave);
                setWorldBossContribution(prev => ({ 
                    ...prev, 
                    claimed_milestones: [...(prev?.claimed_milestones || []), level] 
                }));
                SoundManager.playLevelUp();
            } else {
                toast({ title: 'Error', description: res.data.error || 'Failed to claim reward' });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to claim reward' });
        }
        setClaimingLevel(null);
    };

    const todayDate = moment().format('YYYY-MM-DD');
    const runsToday = (save.raidRuns || {})[todayDate] || 0;
    const extraRuns = (save.extraRaidRuns || {})[todayDate] || 0;
    const MAX_RUNS_PER_DAY = 5 + extraRuns;

    const handleBuyMoreRuns = () => {
        SoundManager.playUIClick();
        const currentSave = SaveManager.load();
        if ((currentSave.cosmicTokens || 0) < 5) {
            toast({ title: 'Not enough tokens', description: 'You need 5 Cosmic Tokens to buy more runs.', variant: 'destructive' });
            return;
        }
        currentSave.cosmicTokens -= 5;
        if (!currentSave.extraRaidRuns) currentSave.extraRaidRuns = {};
        currentSave.extraRaidRuns[todayDate] = (currentSave.extraRaidRuns[todayDate] || 0) + 5;
        SaveManager.save(currentSave);
        setSave(currentSave);

        const week_id = moment().format('YYYY-[W]ww');
        const seasonNum = Math.floor(moment().week() / 4) + 1;
        const season_id = `${moment().format('YYYY')}-S${seasonNum}`;
        
        if (!window.tokenSpendQueue) window.tokenSpendQueue = 0;
        window.tokenSpendQueue += 5;
        if (window.tokenSpendTimeout) clearTimeout(window.tokenSpendTimeout);
        window.tokenSpendTimeout = setTimeout(() => {
            const amountToSend = window.tokenSpendQueue;
            window.tokenSpendQueue = 0;
            if (amountToSend > 0) {
                base44.functions.invoke('recordTokenSpend', { amount: amountToSend, week_id, season_id }).catch(console.error);
            }
        }, 1000);

        toast({ title: 'Success', description: 'Bought 5 more Global Raid runs!' });
    };

    const handleLaunchRaid = () => {
        if (runsToday >= MAX_RUNS_PER_DAY) {
            toast({ title: 'Limit Reached', description: 'You have reached your daily limit.' });
            return;
        }
        
        const currentSave = SaveManager.load();
        if (!currentSave.raidRuns) currentSave.raidRuns = {};
        currentSave.raidRuns[todayDate] = (currentSave.raidRuns[todayDate] || 0) + 1;
        SaveManager.save(currentSave);
        
        SoundManager.playUIClick();
        navigate('/game', { state: { characterId: selectedChar, arenaId: 'world_boss_arena', difficultyId: 'normal', isEndless: false, worldBossId: worldBossData?.boss_id, worldBossName: worldBossData?.name } });
    };

    return (
        <div className={`${isCarousel ? 'h-full flex flex-col' : 'h-[100dvh] flex flex-col'} relative text-slate-200 p-2 pb-24 md:p-6 font-sans overflow-hidden`}>
            {!isCarousel && <SpaceBackground />}
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-2 md:mb-6 border-b border-slate-800 pb-2 md:pb-4 shrink-0">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-2" style={{ background: 'linear-gradient(90deg, #DC2626, #991B1B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(220,38,38,0.5))' }}>
                            <Skull className="w-6 h-6 md:w-8 md:h-8 text-red-600" /> GLOBAL RAID
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">Join forces with all players globally.</p>
                    </div>
                    <CurrencyHeader />
                </header>

                <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto pt-2 md:pt-4 pb-12">
                    <div className="flex justify-center gap-2 mb-2 md:mb-4 w-full max-w-2xl shrink-0">
                        <button onClick={() => { SoundManager.playUIClick(); setActiveTab('raid'); }} className={`flex-1 px-2 md:px-4 py-2 md:py-3 font-bold uppercase tracking-widest text-[10px] md:text-sm rounded-lg border transition-all ${activeTab === 'raid' ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                            Raid Event
                        </button>
                        <button onClick={() => { SoundManager.playUIClick(); setActiveTab('contributors'); }} className={`flex-1 px-2 md:px-4 py-2 md:py-3 font-bold uppercase tracking-widest text-[10px] md:text-sm rounded-lg border transition-all ${activeTab === 'contributors' ? 'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                            Top Contributors
                        </button>
                    </div>

                    <div className="bg-[#0b0416]/50 backdrop-blur-xl border border-red-500/50 rounded-xl md:rounded-2xl p-2 md:p-6 shadow-[0_0_60px_rgba(220,38,38,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] relative overflow-hidden w-full max-w-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
                        
                        {activeTab === 'raid' && (
                            <>
                        <div className="flex justify-between items-center mb-1 md:mb-2">
                            <h3 className="text-xl md:text-2xl font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                                <Skull className="w-5 h-5 md:w-6 md:h-6" /> RAID EVENT
                            </h3>
                            {timeLeft && (
                                <div className="text-xs md:text-sm text-cyan-400 font-bold bg-cyan-950/30 px-2 py-1 rounded border border-cyan-900/50">
                                    Ends in: {timeLeft}
                                </div>
                            )}
                        </div>
                        
                        <p className="text-slate-400 text-xs md:text-sm mb-2 hidden md:block">
                            Work together with the community to drain the boss's health. The boss levels up each time it dies, granting increasing Gold rewards for every level defeated!
                        </p>
                        
                        {worldBossData ? (
                            <div className="bg-slate-950 p-4 md:p-6 rounded-xl border border-red-900 mb-3 md:mb-4 relative overflow-hidden">
                                <div className="absolute right-0 top-0 opacity-10 text-7xl md:text-9xl transform translate-x-1/4 -translate-y-1/4">👹</div>
                                <div className="relative z-10 flex flex-row gap-4 md:gap-8 items-center w-full">
                                    <div className="shrink-0 bg-slate-900/50 rounded-xl border border-red-900/30 shadow-[0_0_15px_rgba(220,38,38,0.15)] flex items-center justify-center overflow-hidden w-28 h-28 md:w-48 md:h-48">
                                        <BossPreview bossId={worldBossData.boss_id} />
                                    </div>
                                    <div className="flex-1 w-full text-left">
                                        <h4 className="text-xl md:text-2xl font-bold text-white mb-1">{worldBossData.name}</h4>
                                        <div className="text-red-400 text-xs md:text-sm mb-2 font-mono font-bold">
                                            LVL {worldBossData.level || 1} &nbsp;|&nbsp; HP: {worldBossData.current_hp.toLocaleString()} / {worldBossData.max_hp.toLocaleString()}
                                        </div>
                                        
                                        <div className="w-full bg-slate-800 h-3 md:h-4 rounded-full overflow-hidden mb-2 border border-slate-700">
                                            <div 
                                                className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-1000"
                                                style={{ width: `${Math.max(0, (worldBossData.current_hp / worldBossData.max_hp) * 100)}%` }}
                                            ></div>
                                        </div>
                                        
                                        {(() => {
                                            const unclaimedLevels = Array.from({length: (worldBossData.level || 1)}).map((_, i) => i + 1).filter(lvl => {
                                                const isReached = lvl < (worldBossData.level || 1);
                                                const isClaimed = (worldBossContribution?.claimed_milestones || []).includes(lvl);
                                                return isReached && worldBossContribution && !isClaimed;
                                            });

                                            if (unclaimedLevels.length === 0) return null;

                                            return (
                                                <div className="mt-2 border-t border-slate-800 pt-2">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                        {unclaimedLevels.map(lvl => (
                                                            <div key={lvl} className="p-2 rounded-lg border border-emerald-500/50 bg-emerald-950/20 flex flex-col items-center justify-center text-center gap-1">
                                                                <div className="text-xs font-bold text-slate-300">Level {lvl}</div>
                                                                <div className="text-yellow-400 text-xs font-mono mb-1">{lvl * 250} Gold</div>
                                                                <button 
                                                                    onClick={() => handleClaimBossReward(lvl)}
                                                                    disabled={claimingLevel !== null}
                                                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] px-2 py-1 rounded font-bold transition-colors w-full"
                                                                >
                                                                    {claimingLevel === lvl ? '...' : 'CLAIM'}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center p-6 md:p-8">
                                <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        
                        <div className="flex flex-col items-center mb-2 md:mb-4 bg-slate-900/50 p-1.5 md:p-3 rounded-xl border border-slate-800">
                            <label className="text-[10px] md:text-xs text-slate-400 mb-1 md:mb-2 uppercase tracking-wider font-bold">Select Operative</label>
                            <div className="flex items-center gap-2 md:gap-4">
                                <button onClick={() => {
                                    SoundManager.playUIClick();
                                    const idx = CHARACTERS.findIndex(c => c.id === selectedChar);
                                    setSelectedChar(CHARACTERS[idx <= 0 ? CHARACTERS.length - 1 : idx - 1].id);
                                }} className="p-1 md:p-2 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 text-white transition-colors">&lt;</button>
                                <div className="text-xs md:text-base font-bold w-32 md:w-40 text-center uppercase" style={{ color: CHARACTERS.find(c => c.id === selectedChar)?.color || '#fff' }}>
                                    {CHARACTERS.find(c => c.id === selectedChar)?.name}
                                </div>
                                <button onClick={() => {
                                    SoundManager.playUIClick();
                                    const idx = CHARACTERS.findIndex(c => c.id === selectedChar);
                                    setSelectedChar(CHARACTERS[idx >= CHARACTERS.length - 1 ? 0 : idx + 1].id);
                                }} className="p-1 md:p-2 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 text-white transition-colors">&gt;</button>
                            </div>
                            {!(save.unlockedCharacters || ['neobyte']).includes(selectedChar) && (
                                <div className="text-[10px] md:text-xs text-red-400 mt-1 font-bold uppercase">Character Locked</div>
                            )}
                        </div>

                        {runsToday >= MAX_RUNS_PER_DAY && !worldBossData?.is_defeated ? (
                            <button
                                onClick={handleBuyMoreRuns}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 md:py-4 rounded-xl font-bold text-sm md:text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 md:w-5 md:h-5" /> BUY 5 MORE RUNS
                                </div>
                                <span className="text-[10px] md:text-xs text-purple-200 flex items-center gap-1 font-normal tracking-normal normal-case">
                                    Cost: 5 <Hexagon className="w-3 h-3 fill-emerald-400 text-emerald-400 inline" /> <span className="text-emerald-400 font-bold">Cosmic Tokens</span>
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={handleLaunchRaid}
                                disabled={worldBossData?.is_defeated || !(save.unlockedCharacters || ['neobyte']).includes(selectedChar)}
                                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 md:py-4 rounded-xl font-bold text-sm md:text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2"
                            >
                                <Crosshair className="w-4 h-4 md:w-5 md:h-5" />
                                {worldBossData?.is_defeated ? 'Boss Defeated' : `Launch Raid (${MAX_RUNS_PER_DAY - runsToday} left today)`}
                            </button>
                        )}
                            </>
                        )}

                        {activeTab === 'contributors' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {topContributors.length > 0 && (
                            <div className="bg-slate-950/80 p-3 md:p-4 rounded-xl border border-slate-800 w-full mt-4 md:mt-6">
                                <h4 className="text-cyan-400 font-bold mb-3 uppercase tracking-widest text-xs md:text-sm flex items-center gap-2">
                                    <Trophy className="w-4 h-4" /> Top Contributors
                                </h4>
                                <div className="space-y-1.5 md:space-y-2 max-h-[300px] overflow-y-auto">
                                    {topContributors.map((c, idx) => (
                                        <div key={c.id} className="flex justify-between items-center bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/50">
                                            <span className="text-slate-300 font-bold text-xs md:text-sm truncate mr-4">
                                                <span className="text-slate-500 w-6 md:w-8 inline-block">#{idx + 1}</span> {c.player_name}
                                            </span>
                                            <span className="text-yellow-400 font-mono font-bold text-xs md:text-sm">
                                                {c.damage.toLocaleString()} DMG
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {recentEvents.length > 0 && (
                            <div className="bg-slate-950/80 p-3 md:p-4 rounded-xl border border-slate-800 w-full mt-4">
                                <h4 className="text-cyan-400 font-bold mb-3 uppercase tracking-widest text-xs md:text-sm flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Live Activity
                                </h4>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {recentEvents.map((evt, idx) => (
                                        <div key={evt.id || idx} className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                                            <div className={`p-1.5 rounded-full flex items-center justify-center ${evt.event_type === 'kill' ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                                {evt.event_type === 'kill' ? <Skull className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-slate-300">
                                                    {evt.message}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {moment(evt.created_date).fromNow()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}