import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function AdminBulkScoreDelete({ walletAddress }) {
    const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
    const [period, setPeriod] = useState('');
    const [periodType, setPeriodType] = useState('week');
    const [confirm, setConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [preview, setPreview] = useState(null);

    const handlePreview = async () => {
        if (!period.trim()) { setMsg('Enter a period first.'); return; }
        setLoading(true); setMsg(''); setPreview(null);
        try {
            const filter = periodType === 'week' ? { week_id: period.trim() } : { season_id: period.trim() };
            const scores = await base44.entities.RunScore.filter(filter, '-score', 500);
            setPreview(scores.length);
            setMsg('');
        } catch (e) {
            setMsg(`✗ ${e.message}`);
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm) { setConfirm(true); return; }
        setLoading(true); setMsg('');
        try {
            const filter = periodType === 'week' ? { week_id: period.trim() } : { season_id: period.trim() };
            const scores = await base44.entities.RunScore.filter(filter, '-score', 500);
            let deleted = 0;
            for (const s of scores) {
                await base44.entities.RunScore.delete(s.id);
                deleted++;
            }
            setMsg(`✓ Deleted ${deleted} scores for ${period}`);
            setPreview(null);
            setConfirm(false);
            setPeriod('');
            // Log the action
            await base44.entities.AdminChangesLog.create({
                wallet_address: walletAddress,
                action_type: 'other',
                description: `Bulk deleted ${deleted} scores for ${period} (${periodType})`,
                details: { period, periodType, count: deleted }
            });
        } catch (e) {
            setMsg(`✗ ${e.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="bg-[#0b0416]/80 border border-red-900/50 rounded-xl p-4">
            <h2 className="text-base font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Trash2 size={16} /> Bulk Score Delete
            </h2>
            <div className="text-xs text-slate-400 mb-4">Delete ALL scores for a specific week or season. Use if a period had corrupted data or needs a full reset.</div>

            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase">Type</label>
                    <select value={periodType} onChange={e => { setPeriodType(e.target.value); setPreview(null); setConfirm(false); }}
                        style={{ colorScheme: 'dark' }}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-red-500">
                        <option value="week">Week (e.g. 2026-W16)</option>
                        <option value="season">Season (e.g. 2026-S4)</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase">Period ID</label>
                    <input type="text" value={period} onChange={e => { setPeriod(e.target.value); setPreview(null); setConfirm(false); }}
                        placeholder={periodType === 'week' ? '2026-W16' : '2026-S4'}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 w-36" />
                </div>
                <button onClick={handlePreview} disabled={loading}
                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-sm transition-colors">
                    {loading ? '...' : 'Preview Count'}
                </button>
                {preview !== null && (
                    <button onClick={handleDelete} disabled={loading}
                        className={`px-4 py-1.5 rounded font-bold text-sm transition-colors flex items-center gap-2 ${
                            confirm ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-red-900/60 hover:bg-red-800 text-red-300'
                        }`}>
                        <AlertTriangle size={14} />
                        {confirm ? `⚠️ CONFIRM: Delete ${preview} scores` : `Delete ${preview} scores`}
                    </button>
                )}
            </div>
            {msg && <div className={`mt-3 text-sm font-mono ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</div>}
            {confirm && <div className="mt-2 text-xs text-yellow-400">⚠️ Click again to confirm. This cannot be undone.</div>}
        </div>
    );
}