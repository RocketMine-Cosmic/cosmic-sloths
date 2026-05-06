import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, AlertTriangle } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { useAvailablePeriods, getCurrentWeekId } from './useAvailablePeriods';

// One-click cleanup: keeps each player's top N scores per (week, mode) and
// archives the rest. Always runs a dry-run first so you can see what it
// will do before committing. Always takes a backup snapshot before executing.

async function autoSnapshot(notes) {
    try {
        await base44.functions.invoke('backupData', {
            adminKey: sessionStorage.getItem('admin_key') || undefined,
            backup_notes: `[auto] ${notes}`,
        });
    } catch (e) { console.warn('[autoSnapshot]', e.message); }
}

export default function AdminCleanupTopScores({ walletAddress }) {
    const [keepN, setKeepN] = useState(1);
    const [period, setPeriod] = useState('all');
    const { weeks } = useAvailablePeriods(walletAddress);
    const [busy, setBusy] = useState(false);
    const [dryResult, setDryResult] = useState(null);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [confirm, setConfirm] = useState(false);

    const runDry = async () => {
        setBusy(true); setError(''); setMsg(''); setDryResult(null);
        try {
            const res = await base44.functions.invoke('cleanupKeepTopScoresPerPlayer', {
                keepN, periodFilter: period, dryRun: true,
                adminKey: sessionStorage.getItem('admin_key') || undefined,
            });
            if (res.data?.error) throw new Error(res.data.error);
            setDryResult(res.data.summary);
        } catch (e) { setError(e.message); }
        setBusy(false);
    };

    const execute = async () => {
        setBusy(true); setError(''); setMsg('');
        try {
            await autoSnapshot(`pre-cleanup-keep-top-${keepN} period=${period}`);
            const res = await base44.functions.invoke('cleanupKeepTopScoresPerPlayer', {
                keepN, periodFilter: period, dryRun: false,
                adminKey: sessionStorage.getItem('admin_key') || undefined,
            });
            if (res.data?.error) throw new Error(res.data.error);
            setMsg(`✓ Archived ${res.data.succeeded} duplicate score(s). ${res.data.failed > 0 ? `(${res.data.failed} failed)` : ''} Restorable for 7 days via Recently Deleted Scores.`);
            setDryResult(null);
        } catch (e) { setError(e.message); }
        setBusy(false); setConfirm(false);
    };

    return (
        <div className="bg-[#0b0416]/80 border border-cyan-900/50 rounded-xl p-4">
            <h2 className="text-base font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Sparkles size={16} /> Keep Top Scores Per Player
            </h2>
            <div className="text-xs text-slate-400 mb-4 leading-relaxed">
                Keeps each player's TOP <span className="text-cyan-300 font-bold">{keepN}</span> score(s) per (week × mode) and archives the rest. Modes are tracked separately ({"\u2068"}Normal vs Endless{"\u2069"}).
                <span className="text-amber-400"> Use this if the leaderboard is missing players</span> — duplicate runs from a few accounts can push real players out of the top 100. Archived rows are recoverable for 7 days.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 uppercase">Keep top N per player per period</label>
                    <select value={keepN} onChange={e => { setKeepN(Number(e.target.value)); setDryResult(null); }} style={{ colorScheme: 'dark' }}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:border-cyan-500">
                        {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>Top {n}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] text-slate-500 uppercase">Scope</label>
                    <select value={period} onChange={e => { setPeriod(e.target.value); setDryResult(null); }} style={{ colorScheme: 'dark' }}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:border-cyan-500 font-mono">
                        <option value="all">All weeks</option>
                        {weeks.map(w => <option key={w} value={w}>{w}{w === getCurrentWeekId() ? ' (current)' : ''}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                <button onClick={runDry} disabled={busy}
                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-sm">
                    {busy && !confirm ? '…' : 'Preview (Dry-Run)'}
                </button>
                {dryResult && dryResult.totalToDelete > 0 && (
                    <button onClick={() => setConfirm(true)} disabled={busy}
                        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2">
                        <AlertTriangle size={14} /> Execute Cleanup ({dryResult.totalToDelete.toLocaleString()})
                    </button>
                )}
            </div>

            {error && <div className="mt-3 text-sm font-mono text-red-400">✗ {error}</div>}
            {msg && <div className="mt-3 text-sm font-mono text-emerald-400">{msg}</div>}

            {dryResult && (
                <div className="mt-4 bg-slate-900/60 border border-cyan-700/40 rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <Stat label="Scanned" value={dryResult.scanned.toLocaleString()} />
                        <Stat label="(player×week×mode)" value={dryResult.buckets.toLocaleString()} />
                        <Stat label="Buckets with extras" value={dryResult.bucketsWithExtras.toLocaleString()} accent />
                        <Stat label="Will delete" value={dryResult.totalToDelete.toLocaleString()} accent danger />
                    </div>
                    {dryResult.totalToDelete === 0 ? (
                        <div className="text-emerald-400 text-sm font-bold">✓ Already clean — no duplicates to remove.</div>
                    ) : (
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Top affected players</div>
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                {dryResult.topAffected.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-slate-500 font-mono w-6">#{i+1}</span>
                                            <span className="font-bold text-white truncate">{p.name}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{p.owner}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-emerald-400 text-[10px]">keep {p.kept}</span>
                                            <span className="text-red-400 text-[10px] font-bold">−{p.deleted}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={confirm}
                onClose={() => !busy && setConfirm(false)}
                onConfirm={execute}
                busy={busy}
                title="Execute leaderboard cleanup"
                description={dryResult ? `Will archive ${dryResult.totalToDelete.toLocaleString()} duplicate score(s) across ${dryResult.uniquePlayersAffected} player(s), keeping the top ${keepN} per player per (week × mode). A backup snapshot will be taken first. Archived rows are restorable for 7 days.` : ''}
                confirmLabel="Execute"
            />
        </div>
    );
}

function Stat({ label, value, accent, danger }) {
    return (
        <div className={`rounded p-2 border ${danger ? 'bg-red-950/30 border-red-800/50' : accent ? 'bg-cyan-950/30 border-cyan-800/50' : 'bg-slate-950/40 border-slate-800'}`}>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
            <div className={`font-mono font-bold ${danger ? 'text-red-300' : accent ? 'text-cyan-300' : 'text-white'} text-sm md:text-base`}>{value}</div>
        </div>
    );
}