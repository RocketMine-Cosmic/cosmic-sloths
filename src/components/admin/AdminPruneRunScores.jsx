import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Play, Square } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

// Drives functions/pruneRunScores in batches: paginated scan to build the
// worklist, then one wallet per call to prune. Live progress, pause/resume,
// dry-run, 429-tolerant.

export default function AdminPruneRunScores() {
    const [phase, setPhase] = useState('idle'); // idle | listing | running | paused | done
    const [wallets, setWallets] = useState([]);
    const [cursor, setCursor] = useState(0);
    const [totalDeleted, setTotalDeleted] = useState(0);
    const [totalFailed, setTotalFailed] = useState(0);
    const [totalScanned, setTotalScanned] = useState(0);
    const [currentWallet, setCurrentWallet] = useState('');
    const [log, setLog] = useState([]);
    const [confirmRun, setConfirmRun] = useState(false);
    const [error, setError] = useState('');
    const cancelRef = useRef(false);

    const adminKey = sessionStorage.getItem('admin_key') || undefined;

    const appendLog = (line) => setLog(prev => [...prev.slice(-99), line]);

    const fetchWallets = async () => {
        setError('');
        setPhase('listing');
        setLog(['Scanning RunScore table for wallets…']);
        try {
            const found = new Set();
            let scanCursor = 0;
            let totalScannedRuns = 0;
            let safety = 0;
            while (safety++ < 200) {
                const res = await base44.functions.invoke('pruneRunScores', {
                    mode: 'list_wallets', cursor: scanCursor, adminKey
                });
                if (res.data?.error) throw new Error(res.data.error);
                const slice = res.data?.wallets || [];
                slice.forEach(w => found.add(w));
                totalScannedRuns += res.data?.runsScanned || 0;
                scanCursor = res.data?.cursor ?? scanCursor;
                appendLog(`  scanned ${totalScannedRuns} rows, ${found.size} unique wallets so far…`);
                if (res.data?.done) break;
                await new Promise(r => setTimeout(r, 400));
            }
            const list = [...found].sort();
            setWallets(list);
            setCursor(0);
            setTotalDeleted(0); setTotalFailed(0); setTotalScanned(0);
            appendLog(`✓ Found ${list.length} wallets across ${totalScannedRuns} runs.`);
            setPhase('idle');
        } catch (e) {
            setError(e.message);
            setPhase('idle');
        }
    };

    const dryRunOne = async () => {
        if (wallets.length === 0) return;
        setError('');
        appendLog(`Dry-running first wallet ${wallets[0].slice(0, 10)}…`);
        try {
            const res = await base44.functions.invoke('pruneRunScores', {
                mode: 'prune_one', wallet: wallets[0], dryRun: true, adminKey
            });
            if (res.data?.error) throw new Error(res.data.error);
            appendLog(`✓ ${wallets[0].slice(0, 10)}: ${res.data.runsScanned} runs scanned, would delete ${res.data.runsToDelete}`);
        } catch (e) {
            setError(e.message);
        }
    };

    const runBatch = async () => {
        cancelRef.current = false;
        setPhase('running');
        setError('');

        let runningDeleted = totalDeleted;
        let runningFailed = totalFailed;
        let runningScanned = totalScanned;

        for (let i = cursor; i < wallets.length; i++) {
            if (cancelRef.current) {
                appendLog(`⏸ Paused at ${i}/${wallets.length}`);
                setCursor(i);
                setPhase('paused');
                return;
            }
            const w = wallets[i];
            setCurrentWallet(w);
            setCursor(i);
            try {
                const res = await base44.functions.invoke('pruneRunScores', {
                    mode: 'prune_one', wallet: w, dryRun: false, adminKey
                });
                if (res.data?.error) throw new Error(res.data.error);
                const d = res.data;
                runningDeleted += d.deleted || 0;
                runningFailed += d.failed || 0;
                runningScanned += d.runsScanned || 0;
                setTotalDeleted(runningDeleted);
                setTotalFailed(runningFailed);
                setTotalScanned(runningScanned);
                if (d.deleted > 0 || d.failed > 0) {
                    appendLog(`✓ ${w.slice(0, 10)}…: −${d.deleted} deleted${d.failed ? ` (${d.failed} failed)` : ''} of ${d.runsScanned}`);
                }
            } catch (e) {
                appendLog(`✗ ${w.slice(0, 10)}…: ${e.message}`);
                runningFailed += 1;
                setTotalFailed(runningFailed);
            }
            // Pacing — gives the SDK a breather between wallet operations.
            await new Promise(r => setTimeout(r, 500));
        }

        setCursor(wallets.length);
        setCurrentWallet('');
        setPhase('done');
        appendLog(`🏁 Done. Deleted ${runningDeleted}, failed ${runningFailed}.`);
    };

    const stop = () => { cancelRef.current = true; };

    const reset = () => {
        setPhase('idle'); setWallets([]); setCursor(0);
        setTotalDeleted(0); setTotalFailed(0); setTotalScanned(0);
        setCurrentWallet(''); setLog([]); setError('');
    };

    const progress = wallets.length === 0 ? 0 : Math.round((cursor / wallets.length) * 100);
    const isRunning = phase === 'running';

    return (
        <div className="bg-[#0b0416]/80 border border-orange-900/50 rounded-xl p-4">
            <h2 className="text-base font-bold text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Trash2 size={16} /> Prune RunScores (Top-5 per bucket)
            </h2>
            <div className="text-xs text-slate-400 mb-4 space-y-1">
                <div>Keeps each player's <strong>top 5 runs</strong> per bucket and deletes the rest:</div>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Weekly normal runs (per week, excluding endless &amp; raid)</li>
                    <li>Endless runs (lifetime)</li>
                    <li>World boss arena runs are <strong>never pruned</strong> (raid contribution log)</li>
                </ul>
            </div>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <button
                    onClick={fetchWallets}
                    disabled={phase === 'listing' || isRunning}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold text-xs"
                >
                    {phase === 'listing' ? 'Scanning…' : '1. Scan wallets'}
                </button>
                {wallets.length > 0 && (
                    <>
                        <button
                            onClick={dryRunOne}
                            disabled={isRunning}
                            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold text-xs"
                        >
                            Dry-run first wallet
                        </button>
                        {phase !== 'running' && (
                            <button
                                onClick={() => setConfirmRun(true)}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1"
                            >
                                <Play size={12} /> {phase === 'paused' || cursor > 0 ? `Resume from #${cursor + 1}` : `2. Run prune (${wallets.length} wallets)`}
                            </button>
                        )}
                        {isRunning && (
                            <button
                                onClick={stop}
                                className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1"
                            >
                                <Square size={12} /> Pause
                            </button>
                        )}
                        {(phase === 'done' || phase === 'paused') && (
                            <button
                                onClick={reset}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded font-bold text-xs"
                            >
                                Reset
                            </button>
                        )}
                    </>
                )}
            </div>

            {error && <div className="mb-3 text-red-400 text-sm font-mono">✗ {error}</div>}

            {wallets.length > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Progress: {cursor} / {wallets.length} wallets ({progress}%)</span>
                        {currentWallet && <span className="font-mono text-orange-300">{currentWallet.slice(0, 10)}…</span>}
                    </div>
                    <div className="h-2 bg-slate-900 border border-slate-700 rounded overflow-hidden">
                        <div
                            className="h-full bg-orange-500 transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {(totalDeleted > 0 || totalFailed > 0 || totalScanned > 0) && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-slate-900/60 border border-emerald-700/40 rounded p-2 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Deleted</div>
                        <div className="text-emerald-400 font-bold font-mono text-lg">{totalDeleted.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-700/40 rounded p-2 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Scanned</div>
                        <div className="text-slate-300 font-bold font-mono text-lg">{totalScanned.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/60 border border-red-700/40 rounded p-2 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Failed</div>
                        <div className="text-red-400 font-bold font-mono text-lg">{totalFailed.toLocaleString()}</div>
                    </div>
                </div>
            )}

            {log.length > 0 && (
                <div className="bg-slate-950/70 border border-slate-700 rounded p-2 max-h-64 overflow-y-auto font-mono text-[10px] space-y-0.5">
                    {log.map((line, i) => (
                        <div key={i} className={
                            line.startsWith('✓') ? 'text-emerald-400'
                            : line.startsWith('✗') ? 'text-red-400'
                            : line.startsWith('⏸') ? 'text-yellow-400'
                            : line.startsWith('🏁') ? 'text-cyan-400'
                            : 'text-slate-400'
                        }>{line}</div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={confirmRun}
                onClose={() => setConfirmRun(false)}
                onConfirm={() => { setConfirmRun(false); runBatch(); }}
                title="Run RunScore prune"
                description={`This will delete every run beyond each player's top 5 per bucket across ${wallets.length} wallets. The operation can be paused at any time. Raid runs are NOT pruned.`}
                confirmText="PRUNE"
                confirmLabel="Start prune"
            />
        </div>
    );
}