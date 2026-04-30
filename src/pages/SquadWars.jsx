import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Swords, Trophy, Skull, ArrowLeft, Crown, Shield, Coins, Puzzle, Flame, Users } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import { SaveManager } from '../game/SaveManager';
import { useToast } from '@/components/ui/use-toast';
import { useOmenXUser } from '@/hooks/useOmenXUser';
import SpaceBackground from '../components/game/SpaceBackground';
import OmenXGate from '../components/game/OmenXGate';
import CurrencyHeader from '../components/game/CurrencyHeader';
import WarHeadToHead from '../components/squadwars/WarHeadToHead';
import WarHistoryRow from '../components/squadwars/WarHistoryRow';
import RaidLeaderboardRow from '../components/squadwars/RaidLeaderboardRow';

export default function SquadWars({ isCarousel }) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user: omenxUser } = useOmenXUser();

    const [activeTab, setActiveTab] = useState('myWar'); // 'myWar' | 'roster' | 'raid' | 'history'
    const [mySquadId, setMySquadId] = useState(null);
    const [myWar, setMyWar] = useState(null);
    const [weekId, setWeekId] = useState('');
    const [roster, setRoster] = useState([]);
    const [history, setHistory] = useState([]);
    const [raidRanking, setRaidRanking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);

    // Load my squad membership — omenxUser may use walletAddress (camelCase) or wallet_address
    useEffect(() => {
        const rawWallet = omenxUser?.wallet_address || omenxUser?.walletAddress || omenxUser?.data?.wallet_address || '';
        if (!rawWallet) {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const wallet = rawWallet.toLowerCase();
                let members = await base44.entities.SquadMember.filter({ wallet_address: wallet });
                if (members.length === 0 && wallet !== rawWallet) {
                    members = await base44.entities.SquadMember.filter({ wallet_address: rawWallet });
                }
                console.log('[SquadWars] wallet lookup:', wallet, '→', members.length, 'memberships');
                if (members.length > 0) setMySquadId(members[0].squad_id);
            } catch (e) {
                console.error('[SquadWars] Failed to load membership:', e);
            }
        })();
    }, [omenxUser]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const calls = [
                base44.functions.invoke('squadWarEngine', { action: 'getRoster' }).then(r => r.data),
                base44.functions.invoke('getSquadRaidLeaderboard', {}).then(r => r.data),
            ];
            if (mySquadId) {
                calls.push(base44.functions.invoke('squadWarEngine', { action: 'getCurrent', squadId: mySquadId }).then(r => r.data));
                calls.push(base44.functions.invoke('squadWarEngine', { action: 'getHistory', squadId: mySquadId, limit: 12 }).then(r => r.data));
            }
            const results = await Promise.all(calls);
            const rosterRes = results[0];
            const raidRes = results[1];
            setRoster(rosterRes?.wars || []);
            setWeekId(rosterRes?.weekId || '');
            setRaidRanking(raidRes?.ranking || []);
            if (mySquadId) {
                setMyWar(results[2]?.war || null);
                setHistory(results[3]?.wars || []);
            }
        } catch (e) {
            console.error('[SquadWars] Load failed:', e);
        }
        setLoading(false);
    }, [mySquadId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Real-time updates: subscribe to SquadWar changes
    useEffect(() => {
        const unsub = base44.entities.SquadWar.subscribe((event) => {
            if (event.type === 'update' || event.type === 'create') {
                // Re-fetch only the slices that need it (cheap — these are small)
                setRoster(prev => {
                    if (!event.data || event.data.week_id !== weekId) return prev;
                    const idx = prev.findIndex(w => w.id === event.data.id);
                    if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = event.data;
                        return next;
                    }
                    return [event.data, ...prev];
                });
                if (mySquadId && event.data && (event.data.squad_a_id === mySquadId || event.data.squad_b_id === mySquadId) && event.data.week_id === weekId) {
                    setMyWar(event.data);
                }
            }
        });
        return unsub;
    }, [mySquadId, weekId]);

    const handleClaimWinBonus = async (warId) => {
        if (claiming) return;
        setClaiming(true);
        try {
            SoundManager.playLevelUp();
            const res = await base44.functions.invoke('squadWarEngine', { action: 'claimWinBonus', warId });
            if (!res.data?.success) {
                toast({ title: 'Error', description: res.data?.error || 'Failed to claim.' });
                return;
            }
            // Apply server save to local
            const currentSave = SaveManager.load();
            if (res.data.saveData?.gold !== undefined) currentSave.gold = res.data.saveData.gold;
            if (res.data.saveData?.relicFragments !== undefined) currentSave.relicFragments = res.data.saveData.relicFragments;
            SaveManager.save(currentSave);

            const r = res.data.reward;
            const titleByLabel = { win: '🏆 War Victory!', tie: '🤝 War Tie Bonus', loss: '🛡️ Consolation Reward' };
            toast({
                title: titleByLabel[r.label] || 'War Bonus',
                description: `+${r.gold.toLocaleString()} Gold${r.fragments > 0 ? ` and +${r.fragments} Relic Fragments` : ''}!`,
            });
            // Refresh history so the claim button disappears
            await loadData();
        } catch (e) {
            console.error(e);
            toast({ title: 'Error', description: 'Failed to claim war bonus.' });
        } finally {
            setClaiming(false);
        }
    };

    return (
        <OmenXGate isCarousel={isCarousel}>
        <div className={`${isCarousel ? 'h-full flex flex-col' : 'min-h-screen'} relative text-slate-200 p-2 pb-20 md:p-6 font-sans`}>
            {!isCarousel && <SpaceBackground />}
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 border-b border-slate-800 pb-2 md:pb-4 shrink-0">
                    <div>
                        {!isCarousel && (
                            <button onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-2 flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors font-bold text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700 w-fit">
                                <ArrowLeft className="w-3 h-3" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-2"
                            style={{ background: 'linear-gradient(90deg, #EF4444, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.5))' }}>
                            <Swords className="w-6 h-6 md:w-8 md:h-8 text-red-400" /> SQUAD WARS
                        </h1>
                        <p className="text-slate-400 mt-0.5 text-xs md:text-sm tracking-widest uppercase">
                            Weekly head-to-head. Outkill your rival squad.
                        </p>
                        {weekId && <div className="text-[10px] text-slate-500 font-mono mt-1">Week: {weekId}</div>}
                    </div>
                    <CurrencyHeader />
                </header>

                {/* Tabs */}
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 shrink-0">
                    {[
                        { id: 'myWar', label: 'My War', icon: Swords },
                        { id: 'roster', label: 'Wars Board', icon: Trophy },
                        { id: 'raid', label: 'Raid Damage', icon: Flame },
                        { id: 'history', label: 'History', icon: Crown },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id}
                                onClick={() => { SoundManager.playUIClick(); setActiveTab(tab.id); }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs md:text-sm whitespace-nowrap transition-all ${
                                    isActive ? 'bg-red-600/30 border border-red-400 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                                             : 'bg-slate-900/60 border border-slate-700 text-slate-400 hover:text-white'
                                }`}>
                                <Icon className="w-3.5 h-3.5" /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 bg-[#0b0416]/60 backdrop-blur-xl rounded-xl border border-red-500/30 p-3 md:p-5 shadow-[0_0_30px_rgba(239,68,68,0.12)] overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'myWar' && (
                                !mySquadId ? (
                                    <div className="text-center py-16 text-slate-400">
                                        <Shield className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                        <div className="text-lg font-bold text-white mb-1">Join a Squad to Fight</div>
                                        <p className="text-sm">Squad Wars are 5v5 (max). Join or create a squad to enter weekly wars.</p>
                                    </div>
                                ) : myWar ? (
                                    <WarHeadToHead war={myWar} mySquadId={mySquadId} onClaim={handleClaimWinBonus} claiming={claiming} />
                                ) : (
                                    <div className="text-center py-16 text-slate-400">
                                        <Swords className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                        <div className="text-lg font-bold text-white mb-1">No War This Week</div>
                                        <p className="text-sm">Squads are paired every Monday at 00:05 UTC. Check back soon!</p>
                                    </div>
                                )
                            )}

                            {activeTab === 'roster' && (
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500 mb-2 uppercase tracking-widest">All wars this week — sorted by total kills</div>
                                    {roster.length === 0 ? (
                                        <div className="text-center text-slate-500 py-12">No wars yet — pairings happen every Monday.</div>
                                    ) : roster.map(war => (
                                        <WarHeadToHead key={war.id} war={war} mySquadId={mySquadId} compact />
                                    ))}
                                </div>
                            )}

                            {activeTab === 'raid' && (
                                <div>
                                    <div className="bg-rose-950/30 border border-rose-700/40 rounded-lg p-3 mb-3 text-xs text-rose-200">
                                        🔥 Top squads by total damage to this week's <strong>Galactic Raid Boss</strong>. Coordinate your squad's attacks!
                                    </div>
                                    {raidRanking.length === 0 ? (
                                        <div className="text-center text-slate-500 py-12">No squad damage logged yet this week.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {raidRanking.map((s, i) => (
                                                <RaidLeaderboardRow key={s.squad_id} entry={s} rank={i + 1} isMine={s.squad_id === mySquadId} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'history' && (
                                !mySquadId ? (
                                    <div className="text-center py-16 text-slate-400">Join a squad to see war history.</div>
                                ) : history.length === 0 ? (
                                    <div className="text-center py-16 text-slate-500">No war history yet.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {history.map(w => (
                                            <WarHistoryRow key={w.id} war={w} mySquadId={mySquadId} onClaim={handleClaimWinBonus} claiming={claiming} myWalletLower={(omenxUser?.wallet_address || '').toLowerCase()} />
                                        ))}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
        </OmenXGate>
    );
}