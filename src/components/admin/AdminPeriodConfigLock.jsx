import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Lock, Unlock, RefreshCw } from 'lucide-react';

// Freeze the current payout config onto a specific undistributed week/season.
// Once locked, editing the global config above no longer changes that period's
// payout — preview and distribution both use the frozen copy.
export default function AdminPeriodConfigLock({ isOwner }) {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const rows = await base44.entities.TokenPool.filter({ distributed: false }, '-period_id', 50);
            setPools(rows);
        } catch (e) {
            setError(e.message || 'Failed to load pools');
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const toggle = async (pool, lock) => {
        setBusyId(pool.id);
        setError('');
        try {
            const res = await base44.functions.invoke('leaderboardPayoutConfig', {
                action: lock ? 'lock_period' : 'unlock_period',
                period_id: pool.period_id,
                period_type: pool.period_type,
            });
            if (res.data?.error) throw new Error(res.data.error);
            await load();
        } catch (e) {
            setError(e.message || 'Action failed');
        }
        setBusyId('');
    };

    if (!isOwner) return null;

    return (
        <div className="bg-[#0b0416]/80 border border-slate-700/60 rounded-xl p-4 mt-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                    <Lock size={14} /> Lock Config Per Period
                </h2>
                <button onClick={load} disabled={loading}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                    <RefreshCw size={12} /> Refresh
                </button>
            </div>

            <div className="text-xs text-slate-400 mb-3 leading-relaxed">
                Locking copies the settings above onto that period. After locking, changing the settings
                only affects periods that are still unlocked — so you can retune next week without
                altering an older week or season you haven't paid out yet.
            </div>

            {error && <div className="mb-3 text-red-400 text-sm">✗ {error}</div>}

            {loading ? (
                <div className="text-slate-500 text-sm">Loading periods…</div>
            ) : pools.length === 0 ? (
                <div className="text-slate-500 text-sm">No undistributed periods.</div>
            ) : (
                <div className="space-y-1.5">
                    {pools.map(p => {
                        const locked = !!p.locked_payout_config && Object.keys(p.locked_payout_config).length > 0;
                        return (
                            <div key={p.id}
                                className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded px-3 py-2 flex-wrap">
                                <span className="font-mono text-sm text-white">{p.period_id}</span>
                                <span className="text-[10px] uppercase tracking-wider text-slate-500">{p.period_type}</span>
                                <span className="text-xs text-slate-400 font-mono">{Math.floor(p.total_spent || 0)} OMENX spend</span>
                                {locked ? (
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                                        <Lock size={10} /> Locked
                                        {p.config_locked_at && (
                                            <span className="text-slate-500 font-normal normal-case ml-1">
                                                {new Date(p.config_locked_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                        <Unlock size={10} /> Uses current settings
                                    </span>
                                )}
                                <button
                                    onClick={() => toggle(p, !locked)}
                                    disabled={busyId === p.id}
                                    className={`ml-auto px-3 py-1 rounded text-xs font-bold disabled:opacity-50 ${
                                        locked
                                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                            : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                                    }`}>
                                    {busyId === p.id ? '…' : locked ? 'Unlock' : 'Lock current settings'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}