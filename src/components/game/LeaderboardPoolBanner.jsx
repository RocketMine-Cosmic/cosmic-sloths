import React from 'react';
import { Trophy } from 'lucide-react';

function OmenXIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="OMENX" />;
}

// Live "Player Pool" banner shown on the Weekly + Seasonal leaderboards.
// Mirrors the Champions Pool banner style so the player can see the running OMENX pot
// they're competing for, what % of the total seasonal/weekly OMENX feeds it, and the
// rank-by-rank split that determines payouts.
export default function LeaderboardPoolBanner({ view, periodId, totalSpent, timeLeft }) {
    const isWeekly = view === 'weekly';
    const poolPct = isWeekly ? 0.20 : 0.30; // mirrors distributeRewards.js
    const playerPool = Math.floor((totalSpent || 0) * poolPct);

    const accent = isWeekly
        ? 'from-cyan-950/50 via-blue-950/50 to-cyan-950/50 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.18)] text-cyan-200'
        : 'from-purple-950/50 via-fuchsia-950/50 to-purple-950/50 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.18)] text-purple-200';
    const numColor = isWeekly ? 'text-cyan-100' : 'text-purple-100';
    const subColor = isWeekly ? 'text-cyan-300' : 'text-purple-300';
    const chipBg = isWeekly ? 'bg-cyan-500/30 text-cyan-100' : 'bg-purple-500/30 text-purple-100';
    const label = isWeekly ? 'Weekly Player Pool' : 'Seasonal Player Pool';

    // Top splits — mirrors distributeRewards.js percentages so players can see the breakdown.
    const splits = isWeekly
        ? [
            { rank: '🥇 1st', pct: 10 },
            { rank: '🥈 2nd', pct: 8 },
            { rank: '🥉 3rd', pct: 6 },
            { rank: '#4–10', pct: 4 },
            { rank: '#11–20', pct: 3 },
            { rank: '#21–45', pct: '1.2–1.8' },
        ]
        : [
            { rank: '🥇 1st', pct: 10 },
            { rank: '🥈 2nd', pct: 7.5 },
            { rank: '🥉 3rd', pct: 6 },
            { rank: '#4–10', pct: 3.2 },
            { rank: '#11–20', pct: 2.2 },
            { rank: '#21–45', pct: '0.7–1.5' },
        ];

    return (
        <div className={`bg-gradient-to-r ${accent} border-2 rounded-xl p-4 mb-4`}>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Trophy className="w-6 h-6" />
                <h3 className="text-lg font-black uppercase tracking-widest">{label}</h3>
                {periodId && <span className={`text-[10px] ${chipBg} px-2 py-0.5 rounded font-bold`}>{periodId}</span>}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
                <OmenXIcon className="w-7 h-7" />
                <span className={`text-3xl md:text-4xl font-black tabular-nums ${numColor}`}>{playerPool.toLocaleString()}</span>
                <span className={`text-xs ${subColor} font-bold uppercase tracking-wider`}>OMENX</span>
                <span className={`text-[10px] ${subColor}/80 ml-2`}>
                    {isWeekly ? '20%' : '30%'} of {(totalSpent || 0).toLocaleString()} OMENX spent
                </span>
            </div>
            {timeLeft && (
                <div className={`mt-2 text-xs font-bold ${subColor}`}>
                    Distributes in: <span className={numColor}>{timeLeft}</span>
                </div>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {splits.map(s => (
                    <span key={s.rank} className={`text-[10px] ${chipBg} rounded px-2 py-0.5 font-bold tabular-nums`}>
                        {s.rank}: {s.pct}%
                    </span>
                ))}
            </div>
            <p className={`text-[10px] ${subColor}/70 mt-2 leading-snug`}>
                Pool grows in real time as players spend OMENX this {isWeekly ? 'week' : 'season'}. Top 45 ranked players share the pool. Paid directly to wallets at period end.
            </p>
        </div>
    );
}