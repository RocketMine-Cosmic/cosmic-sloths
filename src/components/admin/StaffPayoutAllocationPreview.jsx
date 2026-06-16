import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Visual breakdown of where weekly + seasonal OMENX spend actually goes.
// Split into two bars because the underlying pools are calculated from
// different spend windows:
//   - WEEKLY spend funds: weekly leaderboard pool + kill pool + staff payouts
//   - SEASONAL spend funds: seasonal leaderboard pool + Squad Champions pool
//
// The previous single-bar version added seasonal % onto a "weekly" bar, which
// double-counted the budget and made the totals/caps look wrong.
//
// Caps apply to the WEEKLY bar only (where staff payouts live) — that's the
// dimension at risk of being drained by adding more staff wallets.
const SOFT_CAP_PCT = 0.75;
const HARD_CAP_PCT = 0.85;

export default function StaffPayoutAllocationPreview({
    weeklyPlayerPct,
    seasonalPlayerPct,
    killPoolPct,
    squadChampionsPct,
    staffCount,
    numericPct, // per-staff weekly %
}) {
    const staffTotalPct = staffCount * numericPct;

    // WEEKLY spend allocation
    const weeklyAllocPct = weeklyPlayerPct + killPoolPct + staffTotalPct;
    const isOverHardCap = weeklyAllocPct > HARD_CAP_PCT;
    const isOverSoftCap = weeklyAllocPct > SOFT_CAP_PCT && !isOverHardCap;
    const weeklyRetainedPct = Math.max(0, 1 - weeklyAllocPct);

    // SEASONAL spend allocation
    const seasonalAllocPct = seasonalPlayerPct + squadChampionsPct;
    const seasonalRetainedPct = Math.max(0, 1 - seasonalAllocPct);

    return (
        <div className="bg-slate-900/60 border border-slate-700 rounded p-3 mb-3 space-y-3">
            {/* WEEKLY bar */}
            <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Weekly Spend Allocation</div>
                    <div className={`text-xs font-mono font-bold ${isOverHardCap ? 'text-red-400' : isOverSoftCap ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {(weeklyAllocPct * 100).toFixed(2)}% of weekly spend
                    </div>
                </div>
                <div className="relative h-3 w-full bg-slate-950 rounded overflow-hidden flex border border-slate-800">
                    <div className="bg-cyan-600 h-full" style={{ width: `${weeklyPlayerPct * 100}%` }} title={`Weekly players: ${(weeklyPlayerPct * 100).toFixed(2)}%`} />
                    <div className="bg-pink-600 h-full" style={{ width: `${killPoolPct * 100}%` }} title={`Kill pool: ${(killPoolPct * 100).toFixed(2)}%`} />
                    <div className={`${isOverHardCap ? 'bg-red-600' : isOverSoftCap ? 'bg-amber-500' : 'bg-emerald-500'} h-full`}
                        style={{ width: `${Math.min(staffTotalPct, weeklyRetainedPct + staffTotalPct) * 100}%` }}
                        title={`Staff: ${(staffTotalPct * 100).toFixed(2)}%`} />
                    <div className="absolute top-0 bottom-0 w-px bg-amber-300/80" style={{ left: `${SOFT_CAP_PCT * 100}%` }} title="Soft cap 75%" />
                    <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `${HARD_CAP_PCT * 100}%` }} title="Hard cap 85%" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-mono">
                    <span className="text-cyan-400">■ Weekly players {(weeklyPlayerPct * 100).toFixed(2)}%</span>
                    <span className="text-pink-400">■ Kill pool {(killPoolPct * 100).toFixed(2)}%</span>
                    <span className={isOverHardCap ? 'text-red-400' : isOverSoftCap ? 'text-amber-400' : 'text-emerald-400'}>
                        ■ Staff {(staffTotalPct * 100).toFixed(2)}% ({staffCount} × {(numericPct * 100).toFixed(2)}%)
                    </span>
                    <span className="text-slate-500">■ Retained {(weeklyRetainedPct * 100).toFixed(2)}%</span>
                    <span className="text-amber-300">┊ Soft cap {(SOFT_CAP_PCT * 100).toFixed(0)}%</span>
                    <span className="text-red-400">┊ Hard cap {(HARD_CAP_PCT * 100).toFixed(0)}%</span>
                </div>
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

            {/* SEASONAL bar */}
            <div className="border-t border-slate-700/40 pt-3">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Seasonal Spend Allocation</div>
                    <div className="text-xs font-mono font-bold text-indigo-300">
                        {(seasonalAllocPct * 100).toFixed(2)}% of seasonal spend
                    </div>
                </div>
                <div className="relative h-3 w-full bg-slate-950 rounded overflow-hidden flex border border-slate-800">
                    <div className="bg-indigo-600 h-full" style={{ width: `${seasonalPlayerPct * 100}%` }} title={`Seasonal players: ${(seasonalPlayerPct * 100).toFixed(2)}%`} />
                    <div className="bg-purple-600 h-full" style={{ width: `${squadChampionsPct * 100}%` }} title={`Squad Champions: ${(squadChampionsPct * 100).toFixed(2)}%`} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-mono">
                    <span className="text-indigo-400">■ Seasonal players {(seasonalPlayerPct * 100).toFixed(2)}%</span>
                    <span className="text-purple-400">■ Squad Champions {(squadChampionsPct * 100).toFixed(2)}%</span>
                    <span className="text-slate-500">■ Retained {(seasonalRetainedPct * 100).toFixed(2)}%</span>
                </div>
            </div>

            <p className="text-[10px] text-slate-500 italic leading-snug">
                Weekly and seasonal pools come from different spend windows. Staff payouts only affect the <span className="text-amber-300 font-bold">weekly</span> bar.
                Pool %s are live from <code className="text-slate-300">leaderboardPayoutConfig</code> (editable in Rewards → Leaderboard Payout Config).
            </p>
        </div>
    );
}

// Re-export caps so the parent can mirror save-blocking logic without
// duplicating the constants.
export { SOFT_CAP_PCT, HARD_CAP_PCT };