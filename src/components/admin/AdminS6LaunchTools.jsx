import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Coins, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Admin one-shot tools for the S6 launch — Hall of Fame snapshot + squad
// treasury seeding. Both are idempotent (safe to re-run) and log to
// AdminChangesLog. Two-tap confirm prevents accidental clicks.

function ConfirmAction({ label, icon: Icon, accent, helpText, onRun, busy, lastResult }) {
    const [armed, setArmed] = useState(false);
    React.useEffect(() => {
        if (!armed) return;
        const t = setTimeout(() => setArmed(false), 5000);
        return () => clearTimeout(t);
    }, [armed]);

    const handleClick = () => {
        if (busy) return;
        if (!armed) { setArmed(true); return; }
        setArmed(false);
        onRun();
    };

    return (
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
            <div className="flex items-start gap-3 mb-2">
                <Icon className={`w-5 h-5 ${accent} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold ${accent}`}>{label}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed mt-1">{helpText}</div>
                </div>
            </div>
            <button
                onClick={handleClick}
                disabled={busy}
                className={`w-full ${armed ? 'bg-amber-500 ring-2 ring-amber-300 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-2 rounded transition-all`}
            >
                {busy ? 'Running…' : armed ? 'Tap again to confirm' : 'Run'}
            </button>
            {lastResult && (
                <div className={`mt-2 text-[11px] ${lastResult.ok ? 'text-emerald-300' : 'text-red-400'} flex items-start gap-1.5`}>
                    {lastResult.ok ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                    <span>{lastResult.message}</span>
                </div>
            )}
        </div>
    );
}

export default function AdminS6LaunchTools() {
    const [busy, setBusy] = useState(null); // 'snapshot' | 'seed' | null
    const [snapshotResult, setSnapshotResult] = useState(null);
    const [seedResult, setSeedResult] = useState(null);
    const [seasonId, setSeasonId] = useState('2026-S5');
    const [seedAmount, setSeedAmount] = useState(1000);

    const runSnapshot = async () => {
        setBusy('snapshot');
        setSnapshotResult(null);
        try {
            const res = await base44.functions.invoke('snapshotSeasonHallOfFame', {
                seasonId,
                topN: 50,
            });
            if (res.data?.error) throw new Error(res.data.error);
            const top = res.data?.top?.[0];
            setSnapshotResult({
                ok: true,
                message: `Archived ${res.data?.archived || 0} runs for ${seasonId}.${top ? ` Top: ${top.player_name} (${top.score?.toLocaleString()}).` : ''}`,
            });
        } catch (e) {
            setSnapshotResult({ ok: false, message: e.message || 'Snapshot failed' });
        }
        setBusy(null);
    };

    const runSeed = async () => {
        setBusy('seed');
        setSeedResult(null);
        try {
            const res = await base44.functions.invoke('seedSquadTreasuries', {
                amount: Number(seedAmount) || 1000,
            });
            if (res.data?.error) throw new Error(res.data.error);
            setSeedResult({
                ok: true,
                message: `Seeded ${res.data?.seeded || 0} squads (${res.data?.skipped || 0} skipped, already had treasury).`,
            });
        } catch (e) {
            setSeedResult({ ok: false, message: e.message || 'Seed failed' });
        }
        setBusy(null);
    };

    return (
        <div className="bg-[#0b0416]/80 border border-fuchsia-900/50 rounded-xl p-4 space-y-4">
            <div>
                <h2 className="text-base font-bold text-fuchsia-400 uppercase tracking-widest flex items-center gap-2">
                    🚀 S6 Launch Tools
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    One-shot admin actions for the Season 6 rollover. Both are idempotent — safe to re-run.
                </p>
            </div>

            <div className="space-y-3">
                {/* Snapshot Hall of Fame */}
                <div>
                    <ConfirmAction
                        label="Snapshot Season Hall of Fame"
                        icon={Trophy}
                        accent="text-amber-300"
                        helpText="Archives the top 50 RunScores for a season into a permanent LegendaryRun entity. Re-running replaces existing snapshots for that season."
                        onRun={runSnapshot}
                        busy={busy === 'snapshot'}
                        lastResult={snapshotResult}
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Season:</label>
                        <input
                            type="text"
                            value={seasonId}
                            onChange={e => setSeasonId(e.target.value.trim())}
                            placeholder="2026-S5"
                            className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 w-32"
                        />
                    </div>
                </div>

                {/* Seed Squad Treasuries */}
                <div>
                    <ConfirmAction
                        label="Seed Squad Treasuries"
                        icon={Coins}
                        accent="text-emerald-300"
                        helpText="Gives every squad with a 0 treasury a starter gold pile so they can immediately try the cheapest weekly buff. Squads with existing treasury are skipped."
                        onRun={runSeed}
                        busy={busy === 'seed'}
                        lastResult={seedResult}
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Amount per squad:</label>
                        <input
                            type="number"
                            value={seedAmount}
                            onChange={e => setSeedAmount(e.target.value)}
                            min={1}
                            max={50000}
                            className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 w-24"
                        />
                        <span className="text-[10px] text-slate-500">gold (max 50k)</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 leading-relaxed space-y-2">
                <div className="italic text-fuchsia-400">
                    💡 Run these BEFORE the S6 rollover at Mon May 25 00:00 UTC. The Hall of Fame snapshot must run while S5 RunScores still exist (they don't get deleted, but archiving early is best practice).
                </div>
            </div>
        </div>
    );
}