import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gift, Eye, Send, Trophy } from 'lucide-react';
import moment from 'moment';

export default function AdminRewards({ walletAddress }) {
    const [distributePeriod, setDistributePeriod] = useState('');
    const [distributeType, setDistributeType] = useState('weekly');
    const [distributing, setDistributing] = useState(false);
    const [distributeMsg, setDistributeMsg] = useState('');
    const [previewPeriod, setPreviewPeriod] = useState('');
    const [previewType, setPreviewType] = useState('weekly');
    const [previewing, setPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewError, setPreviewError] = useState('');
    const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();

    const { data: payoutLogs } = useQuery({
        queryKey: ['payoutLogs', walletAddress],
        queryFn: () => base44.functions.invoke('getAdminData', { type: 'payouts', walletAddress, accessToken: authData?.accessToken }).then(r => r.data?.payouts || []),
        enabled: !!walletAddress && !!authData?.accessToken
    });

    const handlePreview = async () => {
        if (!previewPeriod.trim()) { setPreviewError('Enter a period ID'); return; }
        setPreviewing(true); setPreviewData(null); setPreviewError('');
        try {
            const res = await base44.functions.invoke('previewPayouts', { period_id: previewPeriod.trim(), period_type: previewType, walletAddress, accessToken: authData?.accessToken });
            setPreviewData(res.data);
        } catch (err) { setPreviewError(err.message); }
        setPreviewing(false);
    };

    const handleDistribute = async () => {
        if (!distributePeriod.trim()) { setDistributeMsg('Enter a period ID'); return; }
        setDistributing(true); setDistributeMsg('');
        try {
            const res = await base44.functions.invoke('manuallyDistributeRewards', { period_id: distributePeriod.trim(), period_type: distributeType, walletAddress, accessToken: authData?.accessToken });
            setDistributeMsg(`✓ Distributed to ${res.data?.paid} players — ${res.data?.totalOmenx} OMENX total`);
            setDistributePeriod('');
            setTimeout(() => setDistributeMsg(''), 6000);
        } catch (err) { setDistributeMsg(`✗ ${err.message}`); }
        setDistributing(false);
    };

    return (
        <div className="space-y-4">
            {/* Preview */}
            <div className="bg-[#0b0416]/80 border border-sky-900/50 rounded-xl p-4">
                <h2 className="text-base font-bold text-sky-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Eye size={16} /> Preview Payouts (Dry Run)</h2>
                <div className="flex flex-wrap gap-2 items-end mb-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase">Period ID</label>
                        <input type="text" placeholder="e.g., 2026-W16" value={previewPeriod} onChange={e => setPreviewPeriod(e.target.value)}
                            className="bg-slate-900 border border-sky-800 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-sky-500 w-48" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase">Type</label>
                        <select value={previewType} onChange={e => setPreviewType(e.target.value)} style={{ colorScheme: 'dark' }}
                            className="bg-slate-900 border border-sky-800 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-sky-500">
                            <option value="weekly">Weekly</option>
                            <option value="seasonal">Seasonal</option>
                        </select>
                    </div>
                    <button onClick={handlePreview} disabled={previewing}
                        className="bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2">
                        <Eye size={14} /> {previewing ? 'Loading...' : 'Preview'}
                    </button>
                </div>
                {previewError && <div className="text-red-400 text-sm mb-3">{previewError}</div>}
                {previewData && (
                    <>
                        <div className="flex flex-wrap gap-3 mb-3">
                            {[
                                { label: 'Total Spent', value: `${previewData.total_spent?.toFixed(2)} OMENX`, color: 'text-white' },
                                { label: 'Reward Pool', value: `${previewData.reward_pool?.toFixed(2)} OMENX`, color: 'text-sky-400' },
                                { label: 'Total Payout', value: `${previewData.total_payout?.toFixed(2)} OMENX`, color: 'text-emerald-400' },
                                { label: 'Recipients', value: previewData.player_count, color: 'text-white' },
                            ].map(s => (
                                <div key={s.label} className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2">
                                    <div className="text-[10px] text-slate-500 uppercase">{s.label}</div>
                                    <div className={`font-mono font-bold text-sm ${s.color}`}>{s.value}</div>
                                </div>
                            ))}
                            <div className={`border rounded-lg px-3 py-2 ${previewData.distributed ? 'bg-red-950/40 border-red-700' : 'bg-emerald-950/40 border-emerald-700'}`}>
                                <div className="text-[10px] text-slate-500 uppercase">Status</div>
                                <div className={`font-mono font-bold text-sm ${previewData.distributed ? 'text-red-400' : 'text-emerald-400'}`}>{previewData.distributed ? 'ALREADY DISTRIBUTED' : 'PENDING'}</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
                                    <tr>
                                        <th className="p-2 text-center">Rank</th>
                                        <th className="p-2">Player</th>
                                        <th className="p-2">Wallet</th>
                                        <th className="p-2 text-right">Score</th>
                                        <th className="p-2 text-right">Would Receive</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {(previewData.payments || []).map(p => (
                                        <tr key={p.rank} className="hover:bg-slate-800/30">
                                            <td className="p-2 text-center font-mono">{p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : `#${p.rank}`}</td>
                                            <td className="p-2 font-bold text-white">{p.player_name}</td>
                                            <td className="p-2 text-slate-500 font-mono text-[10px]">{p.wallet_address ? `${p.wallet_address.slice(0,6)}...${p.wallet_address.slice(-4)}` : '-'}</td>
                                            <td className="p-2 text-right font-mono text-slate-300">{(p.score || 0).toLocaleString()}</td>
                                            <td className="p-2 text-right font-mono font-bold text-sky-400">{p.amount.toFixed(2)} OMENX</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Distribute */}
            <div className="bg-[#0b0416]/80 border border-emerald-900/50 rounded-xl p-4">
                <h2 className="text-base font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Send size={16} /> Distribute Rewards</h2>
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase">Period ID</label>
                        <input type="text" placeholder="e.g., 2026-W16" value={distributePeriod} onChange={e => setDistributePeriod(e.target.value)}
                            className="bg-slate-900 border border-emerald-800 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 w-48" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 uppercase">Type</label>
                        <select value={distributeType} onChange={e => setDistributeType(e.target.value)} style={{ colorScheme: 'dark' }}
                            className="bg-slate-900 border border-emerald-800 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500">
                            <option value="weekly">Weekly</option>
                            <option value="seasonal">Seasonal</option>
                        </select>
                    </div>
                    <button onClick={handleDistribute} disabled={distributing}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2">
                        <Send size={14} /> {distributing ? 'Distributing...' : 'Distribute'}
                    </button>
                </div>
                {distributeMsg && <div className={`mt-2 text-sm font-mono ${distributeMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{distributeMsg}</div>}
            </div>

            {/* Payout Log */}
            <div className="bg-[#0b0416]/80 border border-yellow-900/50 rounded-xl p-4">
                <h2 className="text-base font-bold text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Trophy size={16} /> Payout Log</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
                            <tr>
                                <th className="p-2">Date</th>
                                <th className="p-2">Player</th>
                                <th className="p-2">Wallet</th>
                                <th className="p-2 text-center">Rank</th>
                                <th className="p-2 text-right">OMENX</th>
                                <th className="p-2">Period</th>
                                <th className="p-2">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {(payoutLogs || []).map(log => (
                                <tr key={log.id} className="hover:bg-slate-800/30">
                                    <td className="p-2 text-slate-400 font-mono text-[10px] whitespace-nowrap">{moment(log.created_date).format('MMM D, YYYY HH:mm')}</td>
                                    <td className="p-2 font-bold text-white whitespace-nowrap">{log.player_name}</td>
                                    <td className="p-2 text-slate-500 font-mono text-[10px]" title={log.wallet_address}>{log.wallet_address ? `${log.wallet_address.slice(0,6)}...${log.wallet_address.slice(-4)}` : '-'}</td>
                                    <td className="p-2 text-center font-mono">{log.rank <= 3 ? ['🥇','🥈','🥉'][log.rank-1] : `#${log.rank}`}</td>
                                    <td className="p-2 text-right font-mono font-bold text-yellow-400">{Number(log.amount).toFixed(2)}</td>
                                    <td className="p-2 text-slate-500 font-mono text-[10px]">{log.period_id}</td>
                                    <td className="p-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${log.period_type === 'weekly' ? 'bg-cyan-900/50 text-cyan-400' : 'bg-purple-900/50 text-purple-400'}`}>{log.period_type}</span></td>
                                </tr>
                            ))}
                            {!(payoutLogs || []).length && <tr><td colSpan="7" className="p-6 text-center text-slate-500">No payouts yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}