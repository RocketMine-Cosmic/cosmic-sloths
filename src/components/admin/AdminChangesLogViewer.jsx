import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Activity, Settings, Zap, Shield, Filter } from 'lucide-react';
import moment from 'moment';
import AdminLogDetailsSummary from './AdminLogDetailsSummary.jsx';

const ACTION_ICONS = {
    sku_update: <Settings className="w-4 h-4 text-blue-400" />,
    reward_adjustment: <Zap className="w-4 h-4 text-yellow-400" />,
    pool_reset: <Shield className="w-4 h-4 text-purple-400" />,
    player_action: <Activity className="w-4 h-4 text-cyan-400" />,
    other: <Activity className="w-4 h-4 text-slate-400" />,
};

const ACTION_COLORS = {
    sku_update: 'bg-blue-900/30 border-blue-700/50',
    reward_adjustment: 'bg-yellow-900/30 border-yellow-700/50',
    pool_reset: 'bg-purple-900/30 border-purple-700/50',
    player_action: 'bg-cyan-900/30 border-cyan-700/50',
    other: 'bg-slate-800/30 border-slate-700/50',
};

export default function AdminChangesLogViewer() {
    const [filter, setFilter] = useState('all');

    const { data: changes, isLoading } = useQuery({
        queryKey: ['adminChangesLogFull'],
        queryFn: () => base44.entities.AdminChangesLog.list('-created_date', 100),
        refetchInterval: 15000,
    });

    const filtered = (changes || []).filter(c => filter === 'all' || c.action_type === filter);

    return (
        <div className="bg-[#0b0416]/80 border border-slate-700/50 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} /> Admin Action Log
                </h2>
                <div className="ml-auto flex items-center gap-2">
                    <Filter size={12} className="text-slate-500" />
                    {['all', 'player_action', 'reward_adjustment', 'sku_update', 'pool_reset', 'other'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`text-[10px] px-2 py-1 rounded font-bold transition-colors uppercase ${filter === f ? 'bg-slate-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            {f.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-slate-500"></div></div>
            ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {filtered.length === 0 ? (
                        <div className="text-xs text-slate-500 text-center py-8">No entries found.</div>
                    ) : filtered.map(change => (
                        <div key={change.id} className={`border rounded-lg p-3 ${ACTION_COLORS[change.action_type]}`}>
                            <div className="flex items-start gap-2">
                                <div className="mt-0.5 shrink-0">{ACTION_ICONS[change.action_type]}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-white">{change.description}</div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {change.wallet_address ? `${change.wallet_address.slice(0, 8)}...${change.wallet_address.slice(-4)}` : 'System'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">{moment(change.created_date).format('MMM D YYYY, HH:mm:ss')}</span>
                                        <span className="text-[10px] text-slate-600">{moment(change.created_date).fromNow()}</span>
                                    </div>
                                    <AdminLogDetailsSummary actionType={change.action_type} details={change.details} />
                                    {change.details && Object.keys(change.details).length > 0 && (
                                        <details className="mt-1.5">
                                            <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">Raw JSON</summary>
                                            <pre className="text-[9px] text-slate-400 mt-1 bg-slate-900/50 rounded p-2 overflow-x-auto">
                                                {JSON.stringify(change.details, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}