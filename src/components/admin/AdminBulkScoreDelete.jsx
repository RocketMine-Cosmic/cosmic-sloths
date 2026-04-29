import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, AlertTriangle } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

export default function AdminBulkScoreDelete({ walletAddress }) {
    const [period, setPeriod] = useState('');
    const [periodType, setPeriodType] = useState('week');
    const [showConfirm, setShowConfirm] = useState(false);
    const [busyConfirm, setBusyConfirm] = useState(false);
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
        setBusyConfirm(true);
        setLoading(true); setMsg('');
        try {
            // Auto-snapshot before bulk delete
            try {
                await base44.functions.invoke('backupData', {
                    adminKey: sessionStorage.getItem('admin_key') || undefined,
                    backup_notes: `[auto] pre-bulk-score-delete ${period} (${periodType})`,
                });
            } catch (e) { console.warn('[snapshot]', e.message); }

            const filter = periodType === 'week' ? { week_id: period.trim() } : { season_id: period.trim() };
            const scores = await base44.entities.RunScore.filter(filter, '-score', 500);
            const ids = scores.map(s => s.id);
            let deleted = 0;
            for (const s of scores) {
                await base44.entities.RunScore.delete(s.id);
                deleted++;
            }
            setMsg(`✓ Deleted ${deleted} scores for ${period}`);
            setPreview(null);
            setShowConfirm(false);
            setPeriod('');
            await base44.entities.AdminChangesLog.create({
                wallet_address: walletAddress,
                action_type: 'other',
                description: `Bulk deleted ${deleted} scores for ${period} (${periodType})`,
                details: { period, periodType, count: deleted, deleted_ids: ids }
            });
        } catch (e) {
            setMsg(`✗ ${e.message}`);
        }
        setLoading(false);
        setBusyConfirm(false);
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
                    <select value={periodType} onChange={e => { setPeriodType(e.target.value); setPreview(null); setShowConfirm(false); }}
                        style={{ colorScheme: 'dark' }}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-red-500">
                        <option value="week">Week (e.g. 2026-W16)</option>
                        <option value="season">Season (e.g. 2026-S4)</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase">Period ID</label>
                    <input type="text" value={period} onChange={e => { setPeriod(e.target.value); setPreview(null); setShowConfirm(false); }}
                        placeholder={periodType === 'week' ? '2026-W16' : '2026-S4'}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 w-36" />
                </div>
                <button onClick={handlePreview} disabled={loading}
                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-sm transition-colors">
                    {loading ? '...' : 'Preview Count'}
                </button>
                {preview !== null && preview > 0 && (
                    <button onClick={() => setShowConfirm(true)} disabled={loading}
                        className="px-4 py-1.5 rounded font-bold text-sm transition-colors flex items-center gap-2 bg-red-900/60 hover:bg-red-800 text-red-300">
                        <AlertTriangle size={14} />
                        Delete {preview} scores
                    </button>
                )}
            </div>
            {msg && <div className={`mt-3 text-sm font-mono ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</div>}

            <ConfirmDialog
                open={showConfirm}
                onClose={() => !busyConfirm && setShowConfirm(false)}
                onConfirm={handleDelete}
                busy={busyConfirm}
                title="Bulk delete scores"
                description={`This will permanently delete ${preview} score(s) for ${periodType} ${period}. A snapshot will be taken automatically first, but this is still a major operation.`}
                confirmText={period.trim()}
                confirmLabel={`Delete ${preview} scores`}
            />
        </div>
    );
}