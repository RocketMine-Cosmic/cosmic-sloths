import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, Coins, Gift, Shield, Skull, Trophy, Database, AlertTriangle } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';
import { base44 } from '@/api/base44Client';
import AdminOverview from '../components/admin/AdminOverview';
import AdminPlayers from '../components/admin/AdminPlayers';
import AdminRunScoreLookup from '../components/admin/AdminRunScoreLookup';
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
import AdminRestoreScore from '../components/admin/AdminRestoreScore';
import AdminDeletedScores from '../components/admin/AdminDeletedScores';
import AdminChangesLogViewer from '../components/admin/AdminChangesLogViewer';
import AdminManagers from '../components/admin/AdminManagers';
import AdminOrphanedData from '../components/admin/AdminOrphanedData';
import AdminBackfillNames from '../components/admin/AdminBackfillNames';
import AdminDiscordGuide from '../components/admin/AdminDiscordGuide';
import AdminDiscordChannelsGuide from '../components/admin/AdminDiscordChannelsGuide';
import AdminDataBackup from '../components/admin/AdminDataBackup';
import AdminDataWipe from '../components/admin/AdminDataWipe';
import AdminBlacklist from '../components/admin/AdminBlacklist';
import AdminRefundOmenx from '../components/admin/AdminRefundOmenx';
import AdminRefundSingle from '../components/admin/AdminRefundSingle';
import AdminMaintenanceReset from '../components/admin/AdminMaintenanceReset';
import AdminTokenSpendLogBackfill from '../components/admin/AdminTokenSpendLogBackfill';
import AdminGoldAudit from '../components/admin/AdminGoldAudit';
import AdminGrantPanel from '../components/admin/AdminGrantPanel';
import AdminSuspiciousRuns from '../components/admin/AdminSuspiciousRuns';
import AdminSquadChatModeration from '../components/admin/AdminSquadChatModeration';
import AdminStaffPayouts from '../components/admin/AdminStaffPayouts';
import AdminStaffPayoutBackfill from '../components/admin/AdminStaffPayoutBackfill';
import MyStaffIncomeCard from '../components/admin/MyStaffIncomeCard';
import AdminSquadChampions from '../components/admin/AdminSquadChampions';
import AdminTabNav from '../components/admin/AdminTabNav';
import AdminStaffPayoutConfig from '../components/admin/AdminStaffPayoutConfig';
import AdminStaffPayoutOverrides from '../components/admin/AdminStaffPayoutOverrides';

const TAB_GROUPS = [
    {
        id: 'insights',
        label: '📊 Insights',
        tabs: [
            { id: 'overview',    label: 'Overview',         icon: BarChart3, perm: 'view_data' },
            { id: 'health',      label: '🩺 Health',        icon: BarChart3, perm: 'view_data' },
            { id: 'leaderboard', label: 'Leaderboard',      icon: Trophy,    perm: 'view_data' },
            { id: 'squads',      label: 'Squads',           icon: Shield,    perm: 'view_data' },
            { id: 'economy',     label: 'Economy',          icon: Coins,     perm: 'view_finance' },
            { id: 'changelog',   label: '📋 Audit Log',     icon: Database,  perm: 'view_data' },
            { id: 'discord',     label: '💬 Discord Guide', icon: Database,  perm: 'view_data' },
        ],
    },
    {
        id: 'players',
        label: '👥 Player Operations',
        tabs: [
            { id: 'players',   label: 'Players',      icon: Users,         perm: 'edit_players' },
            { id: 'grant',     label: '🎁 Grant',      icon: Gift,          perm: 'edit_players' },
            { id: 'goldaudit', label: '🪙 Gold Audit', icon: Coins,         perm: 'edit_players' },
            { id: 'blacklist', label: '🚫 Blacklist', icon: AlertTriangle, perm: 'manage_blacklist' },
        ],
    },
    {
        id: 'moderation',
        label: '🛡️ Moderation',
        tabs: [
            { id: 'suspicious',  label: '🔍 Suspicious Runs', icon: AlertTriangle, perm: 'delete_scores' },
            { id: 'chat',        label: '💬 Squad Chat',     icon: Shield,        perm: 'moderate_chat' },
        ],
    },
    {
        id: 'liveops',
        label: '🏆 Live Ops',
        tabs: [
            { id: 'raid',    label: 'Global Raid', icon: Skull, perm: 'manage_raid' },
            { id: 'rewards', label: 'Rewards',     icon: Gift,  perm: 'distribute_rewards' },
            { id: 'champions', label: '👑 Squad Champions', icon: Trophy, perm: 'distribute_rewards' },
            { id: 'skus',    label: 'SKUs',        icon: Gift,  perm: 'view_data' },
            { id: 'content', label: 'Content',     icon: Database, perm: 'view_data' },
        ],
    },
    {
        id: 'hygiene',
        label: '🧹 Data Hygiene',
        tabs: [
            { id: 'duplicates', label: '⚠️ Duplicates', icon: AlertTriangle, perm: 'delete_scores' },
            { id: 'cleanup',    label: '🧹 Cleanup',    icon: Database,      perm: 'delete_scores' },
        ],
    },
    {
        id: 'finance',
        label: '💸 Finance',
        tabs: [
            { id: 'refund_one', label: '💸 Refund Player', icon: Coins, perm: 'refund_single' },
            { id: 'refund', label: '💰 Bulk Refund', icon: AlertTriangle, perm: 'refund_omenx' },
        ],
    },
    {
        id: 'admin',
        label: '🛡️ Admin',
        tabs: [
            { id: 'managers', label: '👥 Managers', icon: Users, perm: 'manage_admins' },
        ],
    },
    {
        id: 'danger',
        label: '⚠️ Danger Zone',
        tabs: [
            { id: 'backups',  label: '💾 Backups',          icon: Database,      perm: 'manage_backups' },
            { id: 'backfill', label: '🔄 Backfill Wallets', icon: AlertTriangle, perm: 'owner' },
            { id: 'wipe',     label: '🗑️ Wipe Data',         icon: AlertTriangle, perm: 'wipe_data' },
            { id: 'reset',    label: '🔄 FULL RESET',       icon: AlertTriangle, perm: 'wipe_data' },
        ],
    },
];

const TABS = TAB_GROUPS.flatMap(g => g.tabs);

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [adminWallet, setAdminWallet] = useState(() => sessionStorage.getItem('admin_wallet') || '');
    const [walletInput, setWalletInput] = useState('');
    const [walletError, setWalletError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [callerPerms, setCallerPerms] = useState(null);
    const isEmergencyKey = adminWallet === 'admin_mode';

    useEffect(() => {
        if (!adminWallet || isEmergencyKey) {
            setCallerPerms(isEmergencyKey ? ['__emergency__'] : null);
            return;
        }
        base44.functions.invoke('getAdminData', { type: 'adminWallets' })
            .then(r => {
                const me = (r.data?.records || []).find(a => a.wallet_address?.toLowerCase() === adminWallet.toLowerCase());
                setCallerPerms(me?.permissions || []);
            })
            .catch(() => setCallerPerms([]));
    }, [adminWallet, isEmergencyKey]);

    const canSeeTab = (tab) => {
        if (isEmergencyKey) return true;
        if (!callerPerms) return false;
        if (callerPerms.includes('owner')) return true;
        return callerPerms.includes(tab.perm);
    };
    const visibleTabs = TABS.filter(canSeeTab);

    useEffect(() => {
        if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
            setActiveTab(visibleTabs[0].id);
        }
    }, [visibleTabs, activeTab]);

    const handleWalletSubmit = async (e, overrideWallet) => {
        if (e) e.preventDefault();
        const wallet = overrideWallet || walletInput;
        try {
            const res = await base44.functions.invoke('getAdminData', { type: 'adminWallets' });
            if (res.data?.error) throw new Error(res.data.error);
            setAdminWallet(wallet);
            sessionStorage.setItem('admin_wallet', wallet);
            setWalletError('');
        } catch {
            setWalletError('Your logged-in wallet is not authorized as an admin');
        }
    };

    const [adminKeyInput, setAdminKeyInput] = useState('');
    const [adminKeyError, setAdminKeyError] = useState('');

    const handleDirectAdminKey = (e) => {
        e?.preventDefault();
        if (!adminKeyInput.trim()) {
            setAdminKeyError('Admin key required');
            return;
        }
        sessionStorage.setItem('admin_key', adminKeyInput);
        setAdminWallet('admin_mode');
        setAdminKeyError('');
    };

    if (!adminWallet) {
        const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
        const linkedWallet = authData?.walletAddress;
        return (
            <div className="min-h-screen relative text-slate-200 flex items-center justify-center font-sans p-4">
                <SpaceBackground />
                <div className="relative z-10 w-full max-w-sm">
                    <button
                        onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                        className="mb-3 flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors font-bold text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700"
                    >
                        <ArrowLeft className="w-3 h-3" /> Back to Main Menu
                    </button>
                    <div className="bg-[#0b0416]/90 border border-red-900/50 rounded-xl p-8 flex flex-col gap-5 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                        <div className="text-center">
                            <h1 className="text-2xl font-black uppercase tracking-widest text-red-400">Admin Access</h1>
                            <p className="text-xs text-slate-400 mt-2">
                                {linkedWallet
                                    ? <>Signed in as <span className="font-mono text-slate-300">{linkedWallet.slice(0, 6)}...{linkedWallet.slice(-4)}</span></>
                                    : 'Sign in with your admin wallet to continue.'}
                            </p>
                        </div>

                        {linkedWallet && (
                            <button type="button"
                                onClick={() => handleWalletSubmit(null, linkedWallet)}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-md transition-colors flex items-center justify-center gap-2">
                                ⚡ Enter Admin Panel
                            </button>
                        )}
                        {walletError && <div className="text-red-400 text-xs text-center">{walletError}</div>}

                        <div className="border-t border-slate-800 pt-4">
                            <details className="group">
                                <summary className="text-[11px] text-slate-500 hover:text-yellow-400 cursor-pointer text-center uppercase tracking-widest font-bold transition-colors list-none flex items-center justify-center gap-1.5">
                                    <span>🔑 Emergency Master Key</span>
                                </summary>
                                <form onSubmit={handleDirectAdminKey} className="mt-3 flex flex-col gap-2">
                                    <p className="text-[10px] text-slate-500 text-center">Bypasses permission checks. Use only when login is unavailable.</p>
                                    <input
                                        type="password"
                                        placeholder="Master admin key"
                                        value={adminKeyInput}
                                        onChange={e => setAdminKeyInput(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:border-yellow-500 font-mono"
                                    />
                                    {adminKeyError && <div className="text-red-400 text-xs">{adminKeyError}</div>}
                                    <button type="submit" className="bg-yellow-700/80 hover:bg-yellow-600 text-white font-bold py-1.5 rounded-md transition-colors text-xs uppercase tracking-widest">Override Access</button>
                                </form>
                            </details>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const canViewFinance = isEmergencyKey || (callerPerms || []).includes('owner') || (callerPerms || []).includes('view_finance');

    // CRITICAL: render ONLY the active tab. Previously this was an object literal,
    // which evaluated EVERY tab's JSX on every render → every admin sub-component
    // mounted simultaneously → all of them fired their `getAdminData` queries
    // in parallel on dashboard load → 429 rate limit. Now only the selected tab
    // mounts, so its queries run alone.
    const renderActiveTab = () => {
        switch (activeTab) {
            case 'overview':    return <AdminOverview walletAddress={adminWallet} canViewFinance={canViewFinance} />;
            case 'health':      return <AdminHealthCheck walletAddress={adminWallet} />;
            case 'leaderboard': return <AdminLeaderboard walletAddress={adminWallet} />;
            case 'players':     return (
                <div className="space-y-4">
                    <AdminPlayers walletAddress={adminWallet} />
                    <AdminRunScoreLookup />
                </div>
            );
            case 'grant':       return <AdminGrantPanel walletAddress={adminWallet} />;
            case 'squads':      return <AdminSquads walletAddress={adminWallet} />;
            case 'raid':        return <AdminRaid walletAddress={adminWallet} />;
            case 'economy':     return <AdminEconomy walletAddress={adminWallet} />;
            case 'suspicious':  return <AdminSuspiciousRuns walletAddress={adminWallet} />;
            case 'chat':        return <AdminSquadChatModeration walletAddress={adminWallet} />;
            case 'rewards':     return <AdminRewards walletAddress={adminWallet} />;
            case 'champions':   return <AdminSquadChampions walletAddress={adminWallet} />;
            case 'skus':        return <AdminSkus walletAddress={adminWallet} />;
            case 'content':     return <AdminContent />;
            case 'duplicates':  return (
                <div className="space-y-4">
                    <AdminDeletedScores />
                    <AdminRestoreScore walletAddress={adminWallet} />
                    <AdminDuplicateScores walletAddress={adminWallet} />
                    <AdminBulkScoreDelete walletAddress={adminWallet} />
                </div>
            );
            case 'cleanup':     return (
                <div className="space-y-4">
                    <AdminBackfillNames />
                    <AdminOrphanedData walletAddress={adminWallet} />
                </div>
            );
            case 'changelog':   return <AdminChangesLogViewer />;
            case 'managers':    return (
                <div className="space-y-4">
                    <AdminStaffPayoutConfig isOwner={isEmergencyKey || (callerPerms || []).includes('owner')} />
                    <AdminStaffPayoutOverrides isOwner={isEmergencyKey || (callerPerms || []).includes('owner')} />
                    <AdminStaffPayouts canViewFinance={canViewFinance} />
                    {(isEmergencyKey || (callerPerms || []).includes('owner')) && <AdminStaffPayoutBackfill />}
                    <AdminManagers walletAddress={adminWallet} />
                </div>
            );
            case 'discord':     return (
                <div className="space-y-6">
                    <AdminDiscordChannelsGuide />
                    <AdminDiscordGuide />
                </div>
            );
            case 'backups':     return <AdminDataBackup walletAddress={adminWallet} />;
            case 'blacklist':   return <AdminBlacklist />;
            case 'wipe':        return <AdminDataWipe walletAddress={adminWallet} />;
            case 'backfill':    return <AdminTokenSpendLogBackfill />;
            case 'refund':      return <AdminRefundOmenx walletAddress={adminWallet} />;
            case 'refund_one':  return <AdminRefundSingle />;
            case 'goldaudit':   return <AdminGoldAudit />;
            case 'reset':       return <AdminMaintenanceReset walletAddress={adminWallet} />;
            default:            return null;
        }
    };

    const callerLabel = isEmergencyKey
        ? '🔑 Emergency Key Mode'
        : callerPerms?.includes('owner')
            ? `👑 Owner — ${adminWallet.slice(0, 6)}...${adminWallet.slice(-4)}`
            : `Staff — ${adminWallet.slice(0, 6)}...${adminWallet.slice(-4)}`;

    return (
        <div className="min-h-screen relative text-slate-200 font-sans">
            <SpaceBackground />
            <div className="max-w-7xl mx-auto relative z-10 p-3 md:p-6 pb-20">
                <header className="flex items-center justify-between mb-4 border-b border-red-900/40 pb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors font-bold text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back
                        </button>
                        <h1 className="text-lg md:text-3xl font-black tracking-widest uppercase flex items-center gap-2" style={{ color: '#ef4444', textShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
                            <BarChart3 className="w-5 h-5 md:w-7 md:h-7" /> ADMIN DASHBOARD
                        </h1>
                        <span className="text-[10px] md:text-xs font-mono text-slate-500 hidden md:inline">{callerLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <MyStaffIncomeCard walletAddress={adminWallet} isEmergencyKey={isEmergencyKey} />
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('admin_wallet');
                                sessionStorage.removeItem('admin_key');
                                setAdminWallet('');
                            }}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-2 py-1 rounded transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <AdminTabNav
                    groups={TAB_GROUPS.map(g => ({ ...g, tabs: g.tabs.filter(canSeeTab) }))}
                    activeTab={activeTab}
                    onSelectTab={setActiveTab}
                />

                {visibleTabs.length === 0 ? (
                    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
                        Loading permissions...
                    </div>
                ) : (
                    renderActiveTab()
                )}
            </div>
        </div>
    );
}