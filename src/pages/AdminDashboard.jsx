import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, Coins, Gift, Shield, Skull, Trophy, Database } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';
import { base44 } from '@/api/base44Client';
import AdminOverview from '../components/admin/AdminOverview';
import AdminPlayers from '../components/admin/AdminPlayers';
import AdminEconomy from '../components/admin/AdminEconomy';
import AdminRewards from '../components/admin/AdminRewards';
import AdminSquads from '../components/admin/AdminSquads';
import AdminRaid from '../components/admin/AdminRaid';
import AdminLeaderboard from '../components/admin/AdminLeaderboard';

const TABS = [
    { id: 'overview',    label: 'Overview',    icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'players',     label: 'Players',     icon: Users },
    { id: 'squads',      label: 'Squads',      icon: Shield },
    { id: 'raid',        label: 'Global Raid', icon: Skull },
    { id: 'economy',     label: 'Economy',     icon: Coins },
    { id: 'rewards',     label: 'Rewards',     icon: Gift },
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('admin_key') || '');
    const [keyInput, setKeyInput] = useState('');
    const [keyError, setKeyError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    const handleKeySubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await base44.functions.invoke('getAdminData', { type: 'pools', adminKey: keyInput });
            if (res.data?.error === 'Forbidden') throw new Error('Forbidden');
            setAdminKey(keyInput);
            sessionStorage.setItem('admin_key', keyInput);
            setKeyError('');
        } catch {
            setKeyError('Invalid admin key');
        }
    };

    if (!adminKey) {
        return (
            <div className="min-h-screen relative text-slate-200 flex items-center justify-center font-sans">
                <SpaceBackground />
                <form onSubmit={handleKeySubmit} className="relative z-10 bg-[#0b0416]/90 border border-red-900/50 rounded-xl p-8 flex flex-col gap-4 w-full max-w-sm">
                    <h1 className="text-xl font-black uppercase tracking-widest text-red-400">Admin Access</h1>
                    <input
                        type="password"
                        placeholder="Enter admin key"
                        value={keyInput}
                        onChange={e => setKeyInput(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                        autoFocus
                    />
                    {keyError && <div className="text-red-400 text-sm">{keyError}</div>}
                    <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-md transition-colors">Enter</button>
                </form>
            </div>
        );
    }

    const TabContent = {
        overview: <AdminOverview adminKey={adminKey} />,
        leaderboard: <AdminLeaderboard adminKey={adminKey} />,
        players: <AdminPlayers adminKey={adminKey} />,
        squads: <AdminSquads adminKey={adminKey} />,
        raid: <AdminRaid adminKey={adminKey} />,
        economy: <AdminEconomy adminKey={adminKey} />,
        rewards: <AdminRewards adminKey={adminKey} />,
    };

    return (
        <div className="min-h-screen relative text-slate-200 font-sans">
            <SpaceBackground />
            <div className="max-w-7xl mx-auto relative z-10 p-3 md:p-6 pb-20">
                <header className="flex items-center justify-between mb-4 border-b border-red-900/40 pb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors font-bold text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back
                        </button>
                        <h1 className="text-lg md:text-3xl font-black tracking-widest uppercase flex items-center gap-2" style={{ color: '#ef4444', textShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
                            <BarChart3 className="w-5 h-5 md:w-7 md:h-7" /> ADMIN DASHBOARD
                        </h1>
                    </div>
                    <button
                        onClick={() => { sessionStorage.removeItem('admin_key'); setAdminKey(''); }}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-2 py-1 rounded transition-colors"
                    >
                        Logout
                    </button>
                </header>

                {/* Tab Nav */}
                <div className="flex gap-1.5 flex-wrap mb-5">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                            >
                                <Icon size={13} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {TabContent[activeTab]}
            </div>
        </div>
    );
}