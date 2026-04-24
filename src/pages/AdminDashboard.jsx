import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, Coins, Gift, Shield, Skull, Trophy, Database, AlertTriangle } from 'lucide-react';
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
import AdminSkus from '../components/admin/AdminSkus';
import AdminContent from '../components/admin/AdminContent';
import AdminHealthCheck from '../components/admin/AdminHealthCheck';
import AdminDuplicateScores from '../components/admin/AdminDuplicateScores';
import AdminBulkScoreDelete from '../components/admin/AdminBulkScoreDelete';
import AdminChangesLogViewer from '../components/admin/AdminChangesLogViewer';
import AdminManagers from '../components/admin/AdminManagers';
import AdminOrphanedData from '../components/admin/AdminOrphanedData';
import AdminDiscordGuide from '../components/admin/AdminDiscordGuide';
import AdminDataBackup from '../components/admin/AdminDataBackup';
import AdminDataWipe from '../components/admin/AdminDataWipe';
import AdminBlacklist from '../components/admin/AdminBlacklist';
import AdminRefundOmenx from '../components/admin/AdminRefundOmenx';
import AdminMaintenanceReset from '../components/admin/AdminMaintenanceReset';

const TABS = [
    { id: 'overview',    label: 'Overview',    icon: BarChart3 },
    { id: 'health',      label: '🩺 Health',   icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'players',     label: 'Players',     icon: Users },
    { id: 'squads',      label: 'Squads',      icon: Shield },
    { id: 'raid',        label: 'Global Raid', icon: Skull },
    { id: 'economy',     label: 'Economy',     icon: Coins },
    { id: 'rewards',     label: 'Rewards',     icon: Gift },
    { id: 'skus',        label: 'SKUs',        icon: Gift },
    { id: 'content',     label: 'Content',     icon: Database },
    { id: 'duplicates',  label: '⚠️ Duplicates', icon: AlertTriangle },
    { id: 'cleanup',     label: '🧹 Cleanup',  icon: Database },
    { id: 'changelog',   label: '📋 Audit Log', icon: Database },
    { id: 'managers',    label: '👥 Managers', icon: Users },
    { id: 'discord',     label: '💬 Discord Guide', icon: Database },
    { id: 'backups',     label: '💾 Backups', icon: Database },
    { id: 'blacklist',   label: '🚫 Blacklist', icon: AlertTriangle },
    { id: 'wipe',        label: '🗑️ Wipe Data', icon: AlertTriangle },
    { id: 'refund',      label: '💸 Refund OMENX', icon: AlertTriangle },
    { id: 'reset',       label: '🔄 FULL RESET', icon: AlertTriangle },
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [adminWallet, setAdminWallet] = useState(() => sessionStorage.getItem('admin_wallet') || '');
    const [walletInput, setWalletInput] = useState('');
    const [walletError, setWalletError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    const handleWalletSubmit = async (e, overrideWallet) => {
        if (e) e.preventDefault();
        const wallet = overrideWallet || walletInput;
        try {
            const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
            if (!authData?.accessToken) {
                setWalletError('Please login with OmenX first');
                return;
            }
            const res = await base44.functions.invoke('getAdminData', { type: 'pools', walletAddress: wallet, accessToken: authData.accessToken });
            if (res.data?.error === 'Forbidden') throw new Error('Forbidden');
            setAdminWallet(wallet);
            sessionStorage.setItem('admin_wallet', wallet);
            setWalletError('');
        } catch {
            setWalletError('Wallet not authorized as admin');
        }
    };

    if (!adminWallet) {
        const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
        const omenxWallet = authData?.walletAddress;
        return (
            <div className="min-h-screen relative text-slate-200 flex items-center justify-center font-sans">
                <SpaceBackground />
                <form onSubmit={handleWalletSubmit} className="relative z-10 bg-[#0b0416]/90 border border-red-900/50 rounded-xl p-8 flex flex-col gap-4 w-full max-w-sm">
                    <h1 className="text-xl font-black uppercase tracking-widest text-red-400">Admin Access</h1>
                    {omenxWallet && (
                        <button type="button"
                            onClick={() => handleWalletSubmit(null, omenxWallet)}
                            className="bg-red-900/40 hover:bg-red-900/70 border border-red-700/50 text-red-300 font-bold py-2.5 rounded-md transition-colors text-sm flex items-center justify-center gap-2">
                            ⚡ Login as {omenxWallet.slice(0, 6)}...{omenxWallet.slice(-4)}
                        </button>
                    )}
                    {omenxWallet && <div className="text-center text-slate-600 text-xs">— or enter a different wallet —</div>}
                    <input
                        type="text"
                        placeholder="Enter wallet address"
                        value={walletInput}
                        onChange={e => setWalletInput(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-red-500 font-mono text-xs"
                    />
                    {walletError && <div className="text-red-400 text-sm">{walletError}</div>}
                    <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-md transition-colors">Authenticate</button>
                </form>
            </div>
        );
    }

    const TabContent = {
        overview: <AdminOverview walletAddress={adminWallet} />,
        health: <AdminHealthCheck walletAddress={adminWallet} />,
        leaderboard: <AdminLeaderboard walletAddress={adminWallet} />,
        players: <AdminPlayers walletAddress={adminWallet} />,
        squads: <AdminSquads walletAddress={adminWallet} />,
        raid: <AdminRaid walletAddress={adminWallet} />,
        economy: <AdminEconomy walletAddress={adminWallet} />,
        rewards: <AdminRewards walletAddress={adminWallet} />,
        skus: <AdminSkus walletAddress={adminWallet} />,
        content: <AdminContent />,
        duplicates: (
            <div className="space-y-4">
                <AdminDuplicateScores walletAddress={adminWallet} />
                <AdminBulkScoreDelete walletAddress={adminWallet} />
            </div>
        ),
        cleanup: <AdminOrphanedData walletAddress={adminWallet} />,
        changelog: <AdminChangesLogViewer />,
        managers: <AdminManagers walletAddress={adminWallet} />,
        discord: <AdminDiscordGuide />,
        backups: <AdminDataBackup walletAddress={adminWallet} />,
        blacklist: <AdminBlacklist />,
        wipe: <AdminDataWipe walletAddress={adminWallet} />,
        refund: <AdminRefundOmenx walletAddress={adminWallet} />,
        reset: <AdminMaintenanceReset walletAddress={adminWallet} />,
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
                        onClick={() => { sessionStorage.removeItem('admin_wallet'); setAdminWallet(''); }}
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