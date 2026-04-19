import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowLeft, BarChart3, Clock, Send, Trophy, Eye } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import moment from 'moment';
import SpaceBackground from '../components/game/SpaceBackground';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('admin_key') || '');
    const [keyInput, setKeyInput] = useState('');
    const [keyError, setKeyError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [distributePeriod, setDistributePeriod] = useState('');
    const [distributeType, setDistributeType] = useState('weekly');
    const [distributing, setDistributing] = useState(false);
    const [distributeMsg, setDistributeMsg] = useState('');
    const [previewPeriod, setPreviewPeriod] = useState('');
    const [previewType, setPreviewType] = useState('weekly');
    const [previewing, setPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewError, setPreviewError] = useState('');

    const handleKeySubmit = async (e) => {
        e.preventDefault();
        // Verify the key by calling a protected function
        try {
            const res = await base44.functions.invoke('getAdminData', { type: 'pools', adminKey: keyInput });
            if (res.data?.error === 'Forbidden') throw new Error('Forbidden');
            setAdminKey(keyInput);
            sessionStorage.setItem('admin_key', keyInput);
            setKeyError('');
        } catch (err) {
            setKeyError('Invalid admin key');
        }
    };

    const user = adminKey ? { role: 'admin' } : null;

    const { data: pools, isLoading: poolsLoading } = useQuery({
        queryKey: ['tokenPools', adminKey],
        queryFn: () => base44.functions.invoke('getAdminData', { type: 'pools', adminKey }).then(r => r.data?.pools || []),
        enabled: !!adminKey
    });

    const { data: spendLogs, isLoading: logsLoading } = useQuery({
        queryKey: ['tokenSpendLogs', adminKey],
        queryFn: () => base44.functions.invoke('getAdminData', { type: 'logs', adminKey }).then(r => r.data?.logs || []),
        enabled: !!adminKey
    });

    const { data: payoutLogs, isLoading: payoutsLoading } = useQuery({
        queryKey: ['payoutLogs', adminKey],
        queryFn: () => base44.functions.invoke('getAdminData', { type: 'payouts', adminKey }).then(r => r.data?.payouts || []),
        enabled: !!adminKey
    });

    const isLoading = poolsLoading || logsLoading || payoutsLoading;

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
                    <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-md transition-colors">
                        Enter
                    </button>
                </form>
            </div>
        );
    }

    const aggregateData = (data) => {
        const grouped = {};
        data.forEach(item => {
            if (!grouped[item.period_id]) {
                grouped[item.period_id] = { period_id: item.period_id, total_spent: 0 };
            }
            grouped[item.period_id].total_spent += item.total_spent;
        });
        return Object.values(grouped);
    };

    const filteredPools = pools?.filter(p => {
        if (!startDate && !endDate) return true;
        const pDate = moment(p.created_date);
        if (startDate && pDate.isBefore(moment(startDate).startOf('day'))) return false;
        if (endDate && pDate.isAfter(moment(endDate).endOf('day'))) return false;
        return true;
    }) || [];

    const filteredLogs = spendLogs?.filter(log => {
        if (!startDate && !endDate) return true;
        const logDate = moment(log.created_date);
        if (startDate && logDate.isBefore(moment(startDate).startOf('day'))) return false;
        if (endDate && logDate.isAfter(moment(endDate).endOf('day'))) return false;
        return true;
    }) || [];

    const weeklyData = aggregateData(filteredPools.filter(p => p.period_type === 'weekly')).sort((a, b) => a.period_id.localeCompare(b.period_id));
    const seasonalData = aggregateData(filteredPools.filter(p => p.period_type === 'seasonal')).sort((a, b) => a.period_id.localeCompare(b.period_id));

    const handlePreview = async () => {
        if (!previewPeriod.trim()) {
            setPreviewError('Enter period ID (e.g., 2026-W16 or 2026-S1)');
            return;
        }
        setPreviewing(true);
        setPreviewData(null);
        setPreviewError('');
        try {
            const res = await base44.functions.invoke('previewPayouts', {
                period_id: previewPeriod.trim(),
                period_type: previewType,
                adminKey
            });
            setPreviewData(res.data);
        } catch (err) {
            setPreviewError(err.message);
        } finally {
            setPreviewing(false);
        }
    };

    const handleDistribute = async () => {
        if (!distributePeriod.trim()) {
            setDistributeMsg('Enter period ID (e.g., 2026-W16 or 2026-S1)');
            return;
        }
        setDistributing(true);
        setDistributeMsg('');
        try {
            const res = await base44.functions.invoke('manuallyDistributeRewards', {
                period_id: distributePeriod.trim(),
                period_type: distributeType,
                adminKey
            });
            setDistributeMsg(`✓ Distributed ${res.data?.paid} players, ${res.data?.totalOmenx} OMENX total`);
            setDistributePeriod('');
            setTimeout(() => setDistributeMsg(''), 5000);
        } catch (err) {
            setDistributeMsg(`✗ ${err.message}`);
        } finally {
            setDistributing(false);
        }
    };

    return (
        <div className="min-h-screen relative text-slate-200 p-2 pb-20 md:p-6 font-sans">
            <SpaceBackground />
            <div className="max-w-6xl mx-auto relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-red-900/40 pb-2 md:pb-4">
                    <div>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                            className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                        >
                            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                        </button>
                        <h1 className="text-xl md:text-4xl font-black tracking-widest uppercase flex items-center gap-3" style={{ color: '#ef4444', textShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
                            <BarChart3 className="w-6 h-6 md:w-8 md:h-8" /> ADMIN DASHBOARD
                        </h1>
                        <p className="text-slate-500 mt-1 md:text-sm text-[10px] tracking-widest uppercase">System Analytics & Token Spending</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-[#0b0416]/80 backdrop-blur-md border border-slate-700 text-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-[#0b0416]/80 backdrop-blur-md border border-slate-700 text-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <div className="flex flex-col justify-end h-full pt-4">
                                <button 
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider border border-red-900/50 hover:bg-red-900/20 px-3 py-1.5 rounded-md transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[#0b0416]/80 backdrop-blur-xl rounded-xl border border-red-900/50 p-4 md:p-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                            <h2 className="text-lg font-bold text-red-400 mb-4 tracking-widest uppercase">Weekly Token Spend</h2>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis dataKey="period_id" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                            itemStyle={{ color: '#ef4444' }}
                                        />
                                        <Bar dataKey="total_spent" name="Tokens Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[#0b0416]/80 backdrop-blur-xl rounded-xl border border-orange-900/50 p-4 md:p-6 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                            <h2 className="text-lg font-bold text-orange-400 mb-4 tracking-widest uppercase">Seasonal Token Spend</h2>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={seasonalData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                        <XAxis dataKey="period_id" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                                            itemStyle={{ color: '#f97316' }}
                                        />
                                        <Line type="monotone" dataKey="total_spent" name="Tokens Spent" stroke="#f97316" strokeWidth={3} dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 bg-[#0b0416]/80 backdrop-blur-xl rounded-xl border border-emerald-900/50 p-4 md:p-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                        <h2 className="text-lg font-bold text-emerald-400 mb-4 tracking-widest uppercase flex items-center gap-2">
                            <Send className="w-5 h-5" /> Distribute Rewards (TEST)
                        </h2>
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Period ID</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., 2026-W16 or 2026-S1"
                                    value={distributePeriod}
                                    onChange={e => setDistributePeriod(e.target.value)}
                                    className="bg-[#0b0416]/80 backdrop-blur-md border border-emerald-700 text-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Type</label>
                                <select 
                                    value={distributeType}
                                    onChange={e => setDistributeType(e.target.value)}
                                    className="bg-[#0b0416]/80 backdrop-blur-md border border-emerald-700 text-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="seasonal">Seasonal</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleDistribute}
                                disabled={distributing}
                                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 text-sm"
                            >
                                <Send className="w-4 h-4" /> {distributing ? 'Distributing...' : 'Send'}
                            </button>
                        </div>
                        {distributeMsg && (
                            <div className={`mt-2 text-sm font-mono ${distributeMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                                {distributeMsg}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 bg-[#0b0416]/80 backdrop-blur-xl rounded-xl border border-sky-900/50 p-4 md:p-6 shadow-[0_0_30px_rgba(14,165,233,0.1)]">
                        <h2 className="text-lg font-bold text-sky-400 mb-4 tracking-widest uppercase flex items-center gap-2">
                            <Eye className="w-5 h-5" /> Preview Payouts (Dry Run)
                        </h2>
                        <div className="flex flex-wrap gap-3 items-end mb-4">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Period ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 2026-W16 or 2026-S1"
                                    value={previewPeriod}
                                    onChange={e => setPreviewPeriod(e.target.value)}
                                    className="bg-[#0b0416]/80 backdrop-blur-md border border-sky-700 text-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Type</label>
                                <select
                                    value={previewType}
                                    onChange={e => setPreviewType(e.target.value)}
                                    className="bg-[#0b0416]/80 backdrop-blur-md border border-sky-700 text-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="seasonal">Seasonal</option>
                                </select>
                            </div>
                            <button
                                onClick={handlePreview}
                                disabled={previewing}
                                className="bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-md transition-colors flex items-center gap-2 text-sm"
                            >
                                <Eye className="w-4 h-4" /> {previewing ? 'Loading...' : 'Preview'}
                            </button>
                        </div>
                        {previewError && <div className="text-red-400 text-sm font-mono mb-3">{previewError}</div>}
                        {previewData && (
                            <>
                                <div className="flex flex-wrap gap-4 mb-4">
                                    <div className="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-2 text-center">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Spent</div>
                                        <div className="font-mono font-bold text-white">{previewData.total_spent?.toFixed(2)} OMENX</div>
                                    </div>
                                    <div className="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-2 text-center">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Reward Pool</div>
                                        <div className="font-mono font-bold text-sky-400">{previewData.reward_pool?.toFixed(2)} OMENX</div>
                                    </div>
                                    <div className="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-2 text-center">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Paying Out</div>
                                        <div className="font-mono font-bold text-emerald-400">{previewData.total_payout?.toFixed(2)} OMENX</div>
                                    </div>
                                    <div className="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-2 text-center">
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Recipients</div>
                                        <div className="font-mono font-bold text-white">{previewData.player_count}</div>
                                    </div>
                                    <div className={`border rounded-lg px-4 py-2 text-center ${previewData.distributed ? 'bg-red-950/40 border-red-700' : 'bg-emerald-950/40 border-emerald-700'}`}>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Status</div>
                                        <div className={`font-mono font-bold text-sm ${previewData.distributed ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {previewData.distributed ? 'ALREADY DISTRIBUTED' : 'PENDING'}
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-900/50 text-slate-400 font-mono tracking-wider border-b border-slate-700/50">
                                            <tr>
                                                <th className="p-3 font-semibold text-center">Rank</th>
                                                <th className="p-3 font-semibold">Player</th>
                                                <th className="p-3 font-semibold">Wallet</th>
                                                <th className="p-3 font-semibold text-right">Score</th>
                                                <th className="p-3 font-semibold text-right">Would Receive</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {(previewData.payments || []).map((p) => (
                                                <tr key={p.rank} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 text-center font-mono text-slate-300">
                                                        {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                                                    </td>
                                                    <td className="p-3 font-bold text-white whitespace-nowrap">{p.player_name}</td>
                                                    <td className="p-3 text-slate-500 font-mono text-xs" title={p.wallet_address}>
                                                        {p.wallet_address ? `${p.wallet_address.slice(0, 6)}...${p.wallet_address.slice(-4)}` : '-'}
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-slate-300">{(p.score || 0).toLocaleString()}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-sky-400">{p.amount.toFixed(2)} OMENX</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-6 bg-[#0b0416]/80 backdrop-blur-xl rounded-xl border border-yellow-900/50 p-4 md:p-6 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                        <h2 className="text-lg font-bold text-yellow-400 mb-4 tracking-widest uppercase flex items-center gap-2">
                            <Trophy className="w-5 h-5" /> Payout Log
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/50 text-slate-400 font-mono tracking-wider border-b border-slate-700/50">
                                    <tr>
                                        <th className="p-3 font-semibold">Date</th>
                                        <th className="p-3 font-semibold">Player</th>
                                        <th className="p-3 font-semibold">Wallet</th>
                                        <th className="p-3 font-semibold text-center">Rank</th>
                                        <th className="p-3 font-semibold text-right">OMENX Paid</th>
                                        <th className="p-3 font-semibold">Period</th>
                                        <th className="p-3 font-semibold">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {(payoutLogs || []).map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                                                {moment(log.created_date).format('MMM D, YYYY HH:mm')}
                                            </td>
                                            <td className="p-3 font-bold text-white whitespace-nowrap">{log.player_name}</td>
                                            <td className="p-3 text-slate-500 font-mono text-xs truncate max-w-[140px]" title={log.wallet_address}>
                                                {log.wallet_address ? `${log.wallet_address.slice(0, 6)}...${log.wallet_address.slice(-4)}` : '-'}
                                            </td>
                                            <td className="p-3 text-center font-mono text-slate-300">
                                                {log.rank === 1 ? '🥇' : log.rank === 2 ? '🥈' : log.rank === 3 ? '🥉' : `#${log.rank}`}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-yellow-400">
                                                {Number(log.amount).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-slate-500 font-mono text-xs">{log.period_id}</td>
                                            <td className="p-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${log.period_type === 'weekly' ? 'bg-cyan-900/50 text-cyan-400' : 'bg-purple-900/50 text-purple-400'}`}>
                                                    {log.period_type}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {!(payoutLogs || []).length && (
                                        <tr>
                                            <td colSpan="7" className="p-6 text-center text-slate-500 font-mono">
                                                No payouts recorded yet. Payout logs appear here after rewards are distributed.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 bg-[#0b0416]/80 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <h2 className="text-lg font-bold text-slate-300 mb-4 tracking-widest uppercase flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" /> Audit Trail
                        </h2>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/50 text-slate-400 font-mono tracking-wider border-b border-slate-700/50">
                                    <tr>
                                        <th className="p-3 font-semibold">Timestamp</th>
                                        <th className="p-3 font-semibold">Player</th>
                                        <th className="p-3 font-semibold text-right">Tokens Spent</th>
                                        <th className="p-3 font-semibold">Season</th>
                                        <th className="p-3 font-semibold">Week</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                                                {moment(log.created_date).format('MMM D, YYYY HH:mm:ss')}
                                            </td>
                                            <td className="p-3 font-bold text-white whitespace-nowrap">
                                                {log.player_name}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-cyan-400">
                                                {log.amount}
                                            </td>
                                            <td className="p-3 text-slate-500 font-mono text-xs">
                                                {log.season_id || '-'}
                                            </td>
                                            <td className="p-3 text-slate-500 font-mono text-xs">
                                                {log.week_id || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {!filteredLogs.length && (
                                        <tr>
                                            <td colSpan="5" className="p-6 text-center text-slate-500 font-mono">
                                                No token spend logs found for the selected dates.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
                )}
            </div>
        </div>
    );
}