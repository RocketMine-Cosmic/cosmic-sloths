import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaveManager } from '../game/SaveManager';
import { ArrowLeft, Skull, Crosshair } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import moment from 'moment';
import { SoundManager } from '../game/SoundManager';
import BossPreview from '../components/game/BossPreview';

export default function GlobalRaid({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(SaveManager.load());
    const { toast } = useToast();
    
    const [worldBossData, setWorldBossData] = useState(null);
    const [worldBossContribution, setWorldBossContribution] = useState(null);
    const [claimingReward, setClaimingReward] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

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
                }
            } catch (e) { console.error('Failed to fetch world boss', e); }
        };
        fetchBoss();
    }, []);

    const handleClaimBossReward = async () => {
        if (!worldBossData || claimingReward) return;
        setClaimingReward(true);
        try {
            const week_id = moment().format('YYYY-[W]ww');
            const res = await base44.functions.invoke('claimBossReward', { week_id });
            if (res.data.status === 'success') {
                const { type, id } = res.data.reward;
                const currentSave = SaveManager.load();
                if (!currentSave.cosmetics) currentSave.cosmetics = { skins: {}, trail: 'default', killEffect: 'none', unlocked: { trails: [], killEffects: [] } };
                if (!currentSave.cosmetics.unlocked) currentSave.cosmetics.unlocked = { trails: [], killEffects: [] };
                
                if (type === 'trail') {
                    if (!currentSave.cosmetics.unlocked.trails.includes(id)) currentSave.cosmetics.unlocked.trails.push(id);
                } else if (type === 'kill_effect') {
                    if (!currentSave.cosmetics.unlocked.killEffects.includes(id)) currentSave.cosmetics.unlocked.killEffects.push(id);
                }
                SaveManager.save(currentSave);
                setWorldBossContribution(prev => ({ ...prev, claimed: true }));
                toast({ title: 'Reward Claimed!', description: `Unlocked limited cosmetic: ${id}` });
                SoundManager.playLevelUp();
            } else {
                toast({ title: 'Error', description: res.data.error || 'Failed to claim reward' });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to claim reward' });
        }
        setClaimingReward(false);
    };

    const selectedChar = save.lastSelectedChar || 'neobyte';

    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} bg-slate-950 text-slate-200 p-2 pb-20 md:p-6 font-mono`}>
            <div className="max-w-5xl mx-auto h-full flex flex-col">
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
                        <h1 className="text-2xl md:text-3xl font-bold text-red-500 tracking-tight flex items-center gap-2">
                            <Skull className="w-6 h-6 md:w-8 md:h-8" /> GLOBAL RAID
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs">Join forces with all players globally.</p>
                    </div>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="bg-slate-900 border border-red-900/50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden w-full max-w-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
                        
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl md:text-2xl font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                                <Skull className="w-5 h-5 md:w-6 md:h-6" /> RAID EVENT
                            </h3>
                            {timeLeft && (
                                <div className="text-xs md:text-sm text-cyan-400 font-bold bg-cyan-950/30 px-2 py-1 rounded border border-cyan-900/50">
                                    Ends in: {timeLeft}
                                </div>
                            )}
                        </div>
                        
                        <p className="text-slate-400 text-xs md:text-sm mb-4">
                            If the community drains its health before the week ends, everyone who contributed damage earns a rare cosmetic reward!
                        </p>
                        
                        {worldBossData ? (
                            <div className="bg-slate-950 p-4 md:p-6 rounded-xl border border-red-900 mb-4 relative overflow-hidden">
                                <div className="absolute right-0 top-0 opacity-10 text-7xl md:text-9xl transform translate-x-1/4 -translate-y-1/4">👹</div>
                                <div className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center w-full">
                                    <div className="shrink-0 bg-slate-900/50 rounded-xl border border-red-900/30 shadow-[0_0_15px_rgba(220,38,38,0.15)] flex items-center justify-center overflow-hidden w-full sm:w-auto aspect-square max-w-[200px] sm:max-w-none">
                                        <BossPreview bossId={worldBossData.boss_id} />
                                    </div>
                                    <div className="flex-1 w-full text-center sm:text-left">
                                        <h4 className="text-xl md:text-2xl font-bold text-white mb-1">{worldBossData.name}</h4>
                                        <div className="text-red-400 text-xs md:text-sm mb-3 font-mono">
                                            HP: {worldBossData.current_hp.toLocaleString()} / {worldBossData.max_hp.toLocaleString()}
                                        </div>
                                        
                                        <div className="w-full bg-slate-800 h-3 md:h-4 rounded-full overflow-hidden mb-4 border border-slate-700">
                                            <div 
                                                className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-1000"
                                                style={{ width: `${Math.max(0, (worldBossData.current_hp / worldBossData.max_hp) * 100)}%` }}
                                            ></div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center text-xs md:text-sm gap-3">
                                            <span className="text-slate-400">
                                                Your Contribution: <span className="text-yellow-400 font-mono font-bold">{(worldBossContribution?.damage || 0).toLocaleString()}</span>
                                            </span>
                                            
                                            {worldBossData.is_defeated ? (
                                                worldBossContribution ? (
                                                    worldBossContribution.claimed ? (
                                                        <span className="text-emerald-500 font-bold bg-emerald-950/30 px-3 py-1.5 rounded">Reward Claimed ✓</span>
                                                    ) : (
                                                        <button 
                                                            onClick={handleClaimBossReward}
                                                            disabled={claimingReward}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors animate-pulse"
                                                        >
                                                            {claimingReward ? 'Claiming...' : 'Claim Reward!'}
                                                        </button>
                                                    )
                                                ) : (
                                                    <span className="text-slate-500 italic">You didn't participate this week.</span>
                                                )
                                            ) : (
                                                <span className="text-red-400 font-bold animate-pulse">BOSS IS ACTIVE</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center p-6 md:p-8">
                                <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        
                        <button
                            onClick={() => { SoundManager.playGameStart(); navigate('/game', { state: { characterId: selectedChar, arenaId: 'world_boss_arena', difficultyId: 'normal', isEndless: true, worldBossId: worldBossData?.boss_id, worldBossName: worldBossData?.name } }); }}
                            disabled={worldBossData?.is_defeated || !save.unlockedCharacters.includes(selectedChar)}
                            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2"
                        >
                            <Crosshair className="w-4 h-4 md:w-5 md:h-5" />
                            {worldBossData?.is_defeated ? 'Boss Defeated' : 'Launch Raid'}
                        </button>
                        <p className="text-center text-slate-500 text-xs mt-3">
                            Currently selected operative: <span className="font-bold text-cyan-400 uppercase">{selectedChar}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}