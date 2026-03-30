import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Pencil, Check, X, ArrowLeft, Trophy, Crosshair, Users, Gift } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import { SaveManager } from '../game/SaveManager';
import moment from 'moment';

export default function Profile({ isCarousel }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [stats, setStats] = useState({
        highestScore: 0,
        totalKills: 0,
    });
    const [squad, setSquad] = useState(null);
    const [rewardsHistory, setRewardsHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const me = await base44.auth.me();
                setUser(me);
                setNewName(me?.full_name || '');

                if (me) {
                    // Fetch Highest Score
                    const topScore = await base44.entities.RunScore.filter({ player_name: me.full_name }, '-score', 1);
                    const maxScore = topScore.length > 0 ? topScore[0].score : 0;

                    // Fetch total kills from local save
                    const save = SaveManager.load();
                    
                    setStats({
                        highestScore: maxScore,
                        totalKills: save.totalKills || 0,
                    });

                    // Fetch Squad Affiliation
                    const memberships = await base44.entities.SquadMember.filter({ user_id: me.id });
                    if (memberships.length > 0) {
                        const mySquad = await base44.entities.Squad.get(memberships[0].squad_id);
                        setSquad(mySquad);
                    }

                    // Fetch Rewards History
                    const rewards = await base44.entities.PendingReward.filter({ player_name: me.full_name, claimed: true }, '-period_id', 50);
                    setRewardsHistory(rewards);
                }
            } catch (e) {
                console.error('Failed to fetch profile data', e);
            }
            setLoading(false);
        };
        fetchProfileData();
    }, []);

    const handleSaveName = async () => {
        if (!newName.trim()) return;
        try {
            await base44.auth.updateMe({ full_name: newName.trim() });
            setUser(prev => ({ ...prev, full_name: newName.trim() }));
            setIsEditingName(false);
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono">
            <div className="max-w-4xl mx-auto relative z-10">
                {!isCarousel && (
                    <button 
                        onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                        className="mb-8 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-bold"
                    >
                        <ArrowLeft size={20} /> Back to Main Menu
                    </button>
                )}

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-6"
                >
                    {/* Header / Name Edit */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-2xl">
                                🦥
                            </div>
                            <div>
                                <h1 className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Pilot Identity</h1>
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            value={newName} 
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="bg-slate-950 text-white px-3 py-1.5 rounded-lg border border-cyan-500 outline-none text-xl w-48 md:w-64 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                        />
                                        <button onClick={handleSaveName} className="p-2 bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded-lg transition-colors border border-green-500/30">
                                            <Check size={20} />
                                        </button>
                                        <button onClick={() => { setIsEditingName(false); setNewName(user?.full_name || ''); }} className="p-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors border border-red-500/30">
                                            <X size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl md:text-3xl font-bold text-white">{user?.full_name || 'Anonymous'}</span>
                                        <button onClick={() => setIsEditingName(true)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors border border-slate-700 hover:border-slate-500">
                                            <Pencil size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="text-center md:text-right">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Joined</div>
                            <div className="text-sm text-slate-300">{moment(user?.created_date).format('MMMM Do YYYY')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Career Stats */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
                            <h2 className="text-xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
                                <Trophy className="w-5 h-5" /> Career Highlights
                            </h2>
                            <div className="space-y-6">
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center gap-4">
                                    <div className="p-3 bg-orange-900/30 rounded-lg text-orange-400 border border-orange-500/30">
                                        <Crosshair className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-400 font-bold mb-1">Total Enemies Defeated</div>
                                        <div className="text-2xl font-mono font-bold text-white">{stats.totalKills.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center gap-4">
                                    <div className="p-3 bg-cyan-900/30 rounded-lg text-cyan-400 border border-cyan-500/30">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-400 font-bold mb-1">Highest Score</div>
                                        <div className="text-2xl font-mono font-bold text-white">{stats.highestScore.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Squad Affiliation */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-orange-400 mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5" /> Squad Affiliation
                            </h2>
                            {squad ? (
                                <div className="bg-slate-800/50 rounded-xl p-5 border border-orange-500/30 text-center">
                                    <div className="text-4xl mb-3">🛡️</div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{squad.name}</h3>
                                    <div className="text-sm font-bold text-orange-400 bg-orange-950/50 px-2 py-1 rounded inline-block border border-orange-900 mb-3">
                                        [{squad.tag}]
                                    </div>
                                    <p className="text-slate-400 text-sm mb-4">{squad.description}</p>
                                    <button 
                                        onClick={() => { SoundManager.playUIClick(); navigate('/squads'); }}
                                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors w-full"
                                    >
                                        View Squad
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 text-center h-[240px] flex flex-col items-center justify-center">
                                    <Users className="w-12 h-12 text-slate-600 mb-3" />
                                    <div className="text-slate-400 mb-4">You are not currently in a squad.</div>
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

                    {/* Rewards History */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                            <Gift className="w-5 h-5" /> Rewards History
                        </h2>
                        
                        {rewardsHistory.length === 0 ? (
                            <div className="text-center text-slate-500 py-8 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                No rewards claimed yet. Compete on the leaderboards to earn Cosmic Tokens!
                            </div>
                        ) : (
                            <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                                {rewardsHistory.map((reward) => (
                                    <div key={reward.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-white mb-1">{reward.reason}</div>
                                            <div className="text-xs text-slate-400">Period: {reward.period_id}</div>
                                        </div>
                                        <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2">
                                            💠 +{reward.amount}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}