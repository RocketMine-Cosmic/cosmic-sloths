import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Single-bar visual breakdown of weekly OMENX spend. Shows the OWNER what % of
// weekly spend is already committed to player/kill/staff pools, and therefore
// what % is "available to withdraw" from the dev wallet on a weekly basis.
//
// Staff slice uses the CURRENTLY-SAVED per-wallet pct (`liveStaffPct`) so the
// bar reflects real weekly payouts, not whatever's in the input box. When the
// owner edits the input, a thin "preview after save" delta sits beside the bar.
//
// Seasonal spend lives in a different window (different distribution job) so
// it's shown as a small secondary line below, not mixed into the same bar —
// mixing them used to make the totals/caps look wrong.
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
    const liveWeeklyAllocPct = weeklyPlayerPct + killPoolPct + liveStaffTotalPct;
    const liveAvailablePct = Math.max(0, 1 - liveWeeklyAllocPct);

    // Preview (unsaved) values — what it WOULD become if the owner saves.
    const previewStaffTotalPct = staffCount * numericPct;
    const previewWeeklyAllocPct = weeklyPlayerPct + killPoolPct + previewStaffTotalPct;
    const hasPreviewDelta = Math.abs(previewWeeklyAllocPct - liveWeeklyAllocPct) > 0.00001;

    const isOverHardCap = previewWeeklyAllocPct > HARD_CAP_PCT;
    const isOverSoftCap = previewWeeklyAllocPct > SOFT_CAP_PCT && !isOverHardCap;

    // SEASONAL (separate spend window — different distribution job)
    const seasonalAllocPct = seasonalPlayerPct + squadChampionsPct;
    const seasonalAvailablePct = Math.max(0, 1 - seasonalAllocPct);

    return (
        <div className="bg-slate-900/60 border border-slate-700 rounded p-3 mb-3 space-y-3">
            {/* SINGLE WEEKLY BAR — what % of weekly spend is committed */}
            <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Weekly Spend — Where Each OMENX Goes</div>
                    <div className="text-xs font-mono font-bold text-emerald-400">
                        {(liveAvailablePct * 100).toFixed(2)}% available to withdraw
                    </div>
                </div>
                <div className="relative h-4 w-full bg-slate-950 rounded overflow-hidden flex border border-slate-800">
                    <div className="bg-cyan-600 h-full" style={{ width: `${weeklyPlayerPct * 100}%` }} title={`Weekly players pool: ${(weeklyPlayerPct * 100).toFixed(2)}%`} />
                    <div className="bg-pink-600 h-full" style={{ width: `${killPoolPct * 100}%` }} title={`Kill pool: ${(killPoolPct * 100).toFixed(2)}%`} />
                    <div className="bg-amber-500 h-full" style={{ width: `${liveStaffTotalPct * 100}%` }} title={`Staff payouts (live): ${(liveStaffTotalPct * 100).toFixed(2)}%`} />
                    <div className="bg-emerald-700/60 h-full flex-1" title={`Available to withdraw: ${(liveAvailablePct * 100).toFixed(2)}%`} />
                    <div className="absolute top-0 bottom-0 w-px bg-amber-300/80" style={{ left: `${SOFT_CAP_PCT * 100}%` }} title="Soft cap 75%" />
                    <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `${HARD_CAP_PCT * 100}%` }} title="Hard cap 85%" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-mono">
                    <span className="text-cyan-400">■ Weekly players pool {(weeklyPlayerPct * 100).toFixed(2)}%</span>
                    <span className="text-pink-400">■ Kill pool {(killPoolPct * 100).toFixed(2)}%</span>
                    <span className="text-amber-400">
                        ■ Staff payouts {(liveStaffTotalPct * 100).toFixed(2)}% ({staffCount} × {((liveStaffPct ?? numericPct) * 100).toFixed(2)}%)
                    </span>
                    <span className="text-emerald-400">■ Available to withdraw {(liveAvailablePct * 100).toFixed(2)}%</span>
                    <span className="text-amber-300">┊ Soft cap {(SOFT_CAP_PCT * 100).toFixed(0)}%</span>
                    <span className="text-red-400">┊ Hard cap {(HARD_CAP_PCT * 100).toFixed(0)}%</span>
                </div>

                {/* Pending-change indicator — only when owner has edited the input */}
                {hasPreviewDelta && (
                    <div className="mt-2 text-[11px] font-mono text-amber-300 flex items-center gap-1.5">
                        ↻ <span>
                            Unsaved change: committing would shift weekly allocation
                            {' '}<strong>{(liveWeeklyAllocPct * 100).toFixed(2)}% → {(previewWeeklyAllocPct * 100).toFixed(2)}%</strong>
                            {' '}(available {(liveAvailablePct * 100).toFixed(2)}% → {Math.max(0, (1 - previewWeeklyAllocPct) * 100).toFixed(2)}%)
                        </span>
                    </div>
                )}

                {isOverHardCap && (
                    <div className="mt-2 text-xs text-red-400 flex items-center gap-1.5 font-bold">
                        <AlertTriangle size={12} /> Hard cap exceeded ({(HARD_CAP_PCT * 100).toFixed(0)}% of weekly spend) — save blocked. Lower % or remove staff wallets.
                    </div>
                )}
                {isOverSoftCap && (
                    <div className="mt-2 text-xs text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> Above soft cap ({(SOFT_CAP_PCT * 100).toFixed(0)}% of weekly spend) — proceed with caution.
                    </div>
                )}
            </div>

            {/* SEASONAL line — separate spend window, smaller footprint */}
            <div className="border-t border-slate-700/40 pt-2 text-[10px] font-mono flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-slate-500 uppercase font-bold">Seasonal spend:</span>
                <span className="text-indigo-400">Players {(seasonalPlayerPct * 100).toFixed(2)}%</span>
                <span className="text-purple-400">Squad Champions {(squadChampionsPct * 100).toFixed(2)}%</span>
                <span className="text-emerald-400">Available {(seasonalAvailablePct * 100).toFixed(2)}%</span>
                <span className="text-slate-500 italic">(separate distribution — doesn't draw from weekly)</span>
            </div>

            <p className="text-[10px] text-slate-500 italic leading-snug">
                Pool %s are live from <code className="text-slate-300">leaderboardPayoutConfig</code>. Staff % is live from <code className="text-slate-300">setStaffPayoutPct</code>.
                Use the <span className="text-emerald-400 font-bold">Available to withdraw</span> figure to gauge how much of weekly spend is yours each week.
            </p>
        </div>
    );
}

// Re-export caps so the parent can mirror save-blocking logic without
// duplicating the constants.
export { SOFT_CAP_PCT, HARD_CAP_PCT };