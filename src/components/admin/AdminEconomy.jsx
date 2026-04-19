import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Coins, Clock } from 'lucide-react';
import moment from 'moment';

export default function AdminEconomy({ adminKey }) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { data: spendLogs, isLoading: logsLoading } = useQuery({
        queryKey: ['tokenSpendLogs', adminKey],
        queryFn: () => base44.functions.invoke('getAdminData', { type: 'logs', adminKey }).then(r => r.data?.logs || []),
        enabled: !!adminKey
    });

    const { data: pools, isLoading: poolsLoading } = useQuery({
        queryKey: ['adminPools', adminKey],
        queryFn: () => base44.functions.invoke('getAdminData', { type: 'pools', adminKey }).then(r => r.data?.pools || []),
        enabled: !!adminKey
    });

    const filteredLogs = (spendLogs || []).filter(log => {
        const d = moment(log.created_date);
        if (startDate && d.isBefore(moment(startDate).startOf('day'))) return false;
        if (endDate && d.isAfter(moment(endDate).endOf('day'))) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Token Pools */}
            <div className="bg-[#0b0416]/80 border border-cyan-900/50 rounded-xl p-4">
                <h2 className="text-base font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Coins size={16} /> Token Pools</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
                            <tr>
                                <th className="p-2">Period</th>
                                <th className="p-2">Type</th>
                                <th className="p-2 text-right">Total Spent</th>
                                <th className="p-2 text-center">Distributed</th>
                                <th className="p-2">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {(pools || []).sort((a, b) => b.period_id.localeCompare(a.period_id)).map(p => (
                                <tr key={p.id} className="hover:bg-slate-800/30">
                                    <td className="p-2 font-mono font-bold text-white">{p.period_id}</td>
                                    <td className="p-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${p.period_type === 'weekly' ? 'bg-cyan-900/50 text-cyan-400' : 'bg-purple-900/50 text-purple-400'}`}>
                                            {p.period_type}
                                        </span>
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-amber-400">{Number(p.total_spent).toFixed(2)} OMENX</td>
                                    <td className="p-2 text-center">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${p.distributed ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                                            {p.distributed ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className="p-2 text-slate-500 font-mono text-[10px]">{moment(p.created_date).format('MMM D, YYYY')}</td>
                                </tr>
                            ))}
                            {poolsLoading && <tr><td colSpan="5" className="p-4 text-center text-slate-500">Loading...</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-[#0b0416]/80 border border-slate-700/50 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="text-base font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Audit Trail</h2>
                    <div className="flex gap-2 ml-auto items-center">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ colorScheme: 'dark' }}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-500" />
                        <span className="text-slate-600 text-xs">to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ colorScheme: 'dark' }}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-500" />
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-2 py-1 rounded">Clear</button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
                            <tr>
                                <th className="p-2">Timestamp</th>
                                <th className="p-2">Player</th>
                                <th className="p-2">Wallet</th>
                                <th className="p-2 text-right">Amount</th>
                                <th className="p-2">Week</th>
                                <th className="p-2">Season</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-800/30">
                                    <td className="p-2 text-slate-400 font-mono text-[10px] whitespace-nowrap">{moment(log.created_date).format('MMM D, YYYY HH:mm:ss')}</td>
                                    <td className="p-2 font-bold text-white whitespace-nowrap">{log.player_name}</td>
                                    <td className="p-2 text-slate-500 font-mono text-[10px]" title={log.wallet_address}>{log.wallet_address ? `${log.wallet_address.slice(0,6)}...${log.wallet_address.slice(-4)}` : '-'}</td>
                                    <td className="p-2 text-right font-mono font-bold text-cyan-400">{log.amount} OMENX</td>
                                    <td className="p-2 text-slate-500 font-mono text-[10px]">{log.week_id || '-'}</td>
                                    <td className="p-2 text-slate-500 font-mono text-[10px]">{log.season_id || '-'}</td>
                                </tr>
                            ))}
                            {logsLoading && <tr><td colSpan="6" className="p-4 text-center text-slate-500">Loading...</td></tr>}
                            {!logsLoading && !filteredLogs.length && <tr><td colSpan="6" className="p-6 text-center text-slate-500">No spend logs found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}