import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Single-bar breakdown of every OMENX commitment that draws from WEEKLY spend.
// All five slices (weekly players pool, kill pool, staff payouts, seasonal
// players pool, squad champions pool) are funded from the same weekly spend
// window — so the bar sums them all and shows what's left as
// "Available to withdraw" from the dev wallet each week.
//
// Staff slice uses the CURRENTLY-SAVED per-wallet pct (`liveStaffPct`) so the
// bar reflects real payouts, not whatever's typed in the input box. When the
// owner edits the input, a "preview after save" delta sits below the bar.
const SOFT_CAP_PCT = 0.75;
const HARD_CAP_PCT = 0.85;

export default function StaffPayoutAllocationPreview({
    weeklyPlayerPct,
    seasonalPlayerPct,
    killPoolPct,
    squadChampionsPct,
    staffCount,
    numericPct,    // per-staff weekly % from the INPUT (preview only)
    liveStaffPct,  // per-staff weekly % currently SAVED (drives real payouts)
}) {
    // Live (saved) values — what the bar reflects.
    const liveStaffTotalPct = staffCount * (liveStaffPct ?? numericPct);
    const liveCommittedPct = weeklyPlayerPct + killPoolPct + liveStaffTotalPct + seasonalPlayerPct + squadChampionsPct;
    const liveAvailablePct = Math.max(0, 1 - liveCommittedPct);

    // Preview (unsaved) values — what it WOULD become if the owner saves.
    const previewStaffTotalPct = staffCount * numericPct;
    const previewCommittedPct = weeklyPlayerPct + killPoolPct + previewStaffTotalPct + seasonalPlayerPct + squadChampionsPct;
    const previewAvailablePct = Math.max(0, 1 - previewCommittedPct);
    const hasPreviewDelta = Math.abs(previewCommittedPct - liveCommittedPct) > 0.00001;

    // Caps only constrain the staff-controllable portion of weekly spend
    // (player/kill/staff). Seasonal+champions sit on top but aren't what the
    // cap is protecting against, so the cap markers stay where they were.
    const cappedSubtotal = weeklyPlayerPct + killPoolPct + previewStaffTotalPct;
    const isOverHardCap = cappedSubtotal > HARD_CAP_PCT;
    const isOverSoftCap = cappedSubtotal > SOFT_CAP_PCT && !isOverHardCap;

    return (
        <div className="bg-slate-900/60 border border-slate-700 rounded p-3 mb-3 space-y-3">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Weekly Spend — Where Each OMENX Goes</div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                    {(liveAvailablePct * 100).toFixed(2)}% available to withdraw
                </div>
            </div>
            <div className="relative h-4 w-full bg-slate-950 rounded overflow-hidden flex border border-slate-800">
                <div className="bg-cyan-600 h-full"    style={{ width: `${weeklyPlayerPct * 100}%` }}    title={`Weekly players pool: ${(weeklyPlayerPct * 100).toFixed(2)}%`} />
                <div className="bg-pink-600 h-full"    style={{ width: `${killPoolPct * 100}%` }}        title={`Kill pool: ${(killPoolPct * 100).toFixed(2)}%`} />
                <div className="bg-amber-500 h-full"   style={{ width: `${liveStaffTotalPct * 100}%` }}  title={`Staff payouts (live): ${(liveStaffTotalPct * 100).toFixed(2)}%`} />
                <div className="bg-indigo-600 h-full"  style={{ width: `${seasonalPlayerPct * 100}%` }}  title={`Seasonal players pool: ${(seasonalPlayerPct * 100).toFixed(2)}%`} />
                <div className="bg-purple-600 h-full"  style={{ width: `${squadChampionsPct * 100}%` }}  title={`Squad Champions pool: ${(squadChampionsPct * 100).toFixed(2)}%`} />
                <div className="bg-emerald-700/60 h-full flex-1" title={`Available to withdraw: ${(liveAvailablePct * 100).toFixed(2)}%`} />
                <div className="absolute top-0 bottom-0 w-px bg-amber-300/80" style={{ left: `${SOFT_CAP_PCT * 100}%` }} title="Soft cap 75%" />
                <div className="absolute top-0 bottom-0 w-px bg-red-400"      style={{ left: `${HARD_CAP_PCT * 100}%` }} title="Hard cap 85%" />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-mono">
                <span className="text-cyan-400">■ Weekly players {(weeklyPlayerPct * 100).toFixed(2)}%</span>
                <span className="text-pink-400">■ Kill pool {(killPoolPct * 100).toFixed(2)}%</span>
                <span className="text-amber-400">
                    ■ Staff {(liveStaffTotalPct * 100).toFixed(2)}% ({staffCount} × {((liveStaffPct ?? numericPct) * 100).toFixed(2)}%)
                </span>
                <span className="text-indigo-400">■ Seasonal players {(seasonalPlayerPct * 100).toFixed(2)}%</span>
                <span className="text-purple-400">■ Squad Champions {(squadChampionsPct * 100).toFixed(2)}%</span>
                <span className="text-emerald-400">■ Available to withdraw {(liveAvailablePct * 100).toFixed(2)}%</span>
                <span className="text-amber-300">┊ Soft cap {(SOFT_CAP_PCT * 100).toFixed(0)}%</span>
                <span className="text-red-400">┊ Hard cap {(HARD_CAP_PCT * 100).toFixed(0)}%</span>
            </div>

            {hasPreviewDelta && (
                <div className="text-[11px] font-mono text-amber-300 flex items-start gap-1.5">
                    ↻ <span>
                        Unsaved change: committing would shift weekly commitments
                        {' '}<strong>{(liveCommittedPct * 100).toFixed(2)}% → {(previewCommittedPct * 100).toFixed(2)}%</strong>
                        {' '}(available {(liveAvailablePct * 100).toFixed(2)}% → {(previewAvailablePct * 100).toFixed(2)}%).
                    </span>
                </div>
            )}

            {isOverHardCap && (
                <div className="text-xs text-red-400 flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={12} /> Hard cap exceeded ({(HARD_CAP_PCT * 100).toFixed(0)}% of weekly spend on player+kill+staff) — save blocked.
                </div>
            )}
            {isOverSoftCap && (
                <div className="text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Above soft cap ({(SOFT_CAP_PCT * 100).toFixed(0)}% on player+kill+staff) — proceed with caution.
                </div>
            )}

            <p className="text-[10px] text-slate-500 italic leading-snug">
                All five pools draw from the same weekly OMENX spend window. Pool %s are live from <code className="text-slate-300">leaderboardPayoutConfig</code>; staff % is live from <code className="text-slate-300">setStaffPayoutPct</code>. The <span className="text-emerald-400 font-bold">Available to withdraw</span> figure is your weekly dev-wallet take.
            </p>
        </div>
    );
}

// Re-export caps so the parent can mirror save-blocking logic without
// duplicating the constants.
export { SOFT_CAP_PCT, HARD_CAP_PCT };