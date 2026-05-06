import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

// Two analysis modes:
//   • "cohort"  — classic D1/D2/D7/D14/D30 retention (% of new players who came back).
//   • "active"  — unique active players grouped by day/week/month over a chosen window.
// Hugo asked (2026-05-06) for date-range + group-by toggles; "active" satisfies both.

const RANGE_PRESETS = [
    { id: '7d',   label: '7 days',   days: 7   },
    { id: '30d',  label: '30 days',  days: 30  },
    { id: '90d',  label: '90 days',  days: 90  },
    { id: '180d', label: '6 months', days: 180 },
    { id: '365d', label: '1 year',   days: 365 },
];

const GROUP_OPTIONS = [
    { id: 'day',   label: 'Day' },
    { id: 'week',  label: 'Week' },
    { id: 'month', label: 'Month' },
];

function bucketKey(ts, groupBy) {
    const d = new Date(ts);
    if (groupBy === 'day') return d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (groupBy === 'month') return d.toISOString().slice(0, 7); // YYYY-MM
    // ISO week (Mon-start)
    const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const isoYear = tmp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

export default function AdminRetentionChart({ walletAddress }) {
    const [mode, setMode] = useState('cohort'); // 'cohort' | 'active'
    const [rangeId, setRangeId] = useState('30d');
    const [groupBy, setGroupBy] = useState('day');

    const { data, isLoading } = useQuery({
        queryKey: ['adminRetention', walletAddress],
        queryFn: async () => {
            const scores = (await base44.functions.invoke('getAdminDataExtended', {
                type: 'scores', period: 'all'
            })).data?.scores ?? [];

            // Build per-wallet timeline once — both modes consume it.
            const firstPlay = {};
            const allPlays = {};
            scores.forEach(s => {
                const wallet = s.wallet_address || s.user_id;
                if (!wallet) return;
                const ts = new Date(s.created_date).getTime();
                if (!firstPlay[wallet] || ts < firstPlay[wallet]) firstPlay[wallet] = ts;
                if (!allPlays[wallet]) allPlays[wallet] = [];
                allPlays[wallet].push(ts);
            });
            return { firstPlay, allPlays, totalScores: scores.length };
        },
        enabled: !!walletAddress,
    });

    // Cohort retention (Day 1/2/7/14/30)
    const cohortData = useMemo(() => {
        if (!data) return { retention: [], total: 0 };
        const { firstPlay, allPlays } = data;
        const total = Object.keys(firstPlay).length;
        if (total === 0) return { retention: [], total: 0 };
        const DAY = 86400000;
        const thresholds = [
            { label: 'Day 1', days: 1 },
            { label: 'Day 2', days: 2 },
            { label: 'Day 7', days: 7 },
            { label: 'Day 14', days: 14 },
            { label: 'Day 30', days: 30 },
        ];
        const retention = thresholds.map(({ label, days }) => {
            const returned = Object.entries(firstPlay).filter(([wallet, first]) => {
                const plays = allPlays[wallet] || [];
                return plays.some(ts => ts > first + (days - 1) * DAY && ts < first + (days + 2) * DAY);
            }).length;
            return { label, pct: Math.round((returned / total) * 100), count: returned };
        });
        return { retention, total };
    }, [data]);

    // Active players grouped by day/week/month over selected window
    const activeData = useMemo(() => {
        if (!data) return { buckets: [], peak: 0 };
        const { allPlays } = data;
        const range = RANGE_PRESETS.find(r => r.id === rangeId);
        const cutoff = Date.now() - range.days * 86400000;
        const bucketSet = {}; // bucket → Set(wallet)
        Object.entries(allPlays).forEach(([wallet, plays]) => {
            plays.forEach(ts => {
                if (ts < cutoff) return;
                const key = bucketKey(ts, groupBy);
                if (!bucketSet[key]) bucketSet[key] = new Set();
                bucketSet[key].add(wallet);
            });
        });
        const buckets = Object.entries(bucketSet)
            .map(([key, set]) => ({ label: key, count: set.size }))
            .sort((a, b) => a.label.localeCompare(b.label));
        const peak = buckets.reduce((m, b) => Math.max(m, b.count), 0);
        return { buckets, peak };
    }, [data, rangeId, groupBy]);

    const COLORS = ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75'];

    const CohortTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs">
                <div className="font-bold text-white">{d.label} Retention</div>
                <div className="text-cyan-400">{d.pct}% ({d.count} players)</div>
                <div className="text-slate-400">of {cohortData.total} total</div>
            </div>
        );
    };

    const ActiveTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs">
                <div className="font-bold text-white">{d.label}</div>
                <div className="text-cyan-400">{d.count} active players</div>
            </div>
        );
    };

    return (
        <div className="bg-[#0b0416]/80 border border-cyan-900/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Player Retention</h3>
                <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-lg p-0.5">
                    {[
                        { id: 'cohort', label: 'Cohort' },
                        { id: 'active', label: 'Active Players' },
                    ].map(m => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                mode === m.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="text-[10px] text-slate-500 mb-3">
                {mode === 'cohort'
                    ? '% of new players who returned and played again within that day window'
                    : 'Unique active players per bucket — pick your range and grouping'}
            </div>

            {mode === 'active' && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Range</span>
                    <div className="flex flex-wrap gap-1">
                        {RANGE_PRESETS.map(r => (
                            <button
                                key={r.id}
                                onClick={() => setRangeId(r.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                                    rangeId === r.id ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-2">Group by</span>
                    <div className="flex gap-1">
                        {GROUP_OPTIONS.map(g => (
                            <button
                                key={g.id}
                                onClick={() => setGroupBy(g.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                                    groupBy === g.id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-cyan-500"></div></div>
            ) : mode === 'cohort' ? (
                !cohortData.retention.length ? (
                    <div className="text-slate-500 text-sm text-center py-8">Not enough data yet.</div>
                ) : (
                    <>
                        <div className="text-[10px] text-slate-500 mb-2">{cohortData.total} unique players in dataset</div>
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cohortData.retention} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                                    <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
                                    <Tooltip content={<CohortTooltip />} />
                                    <Bar dataKey="pct" name="Retention %" radius={[4, 4, 0, 0]}>
                                        {cohortData.retention.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )
            ) : (
                !activeData.buckets.length ? (
                    <div className="text-slate-500 text-sm text-center py-8">No active players in this window.</div>
                ) : (
                    <>
                        <div className="text-[10px] text-slate-500 mb-2">
                            {activeData.buckets.length} buckets · peak {activeData.peak} active in a single {groupBy}
                        </div>
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activeData.buckets}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                                    <Tooltip content={<ActiveTooltip />} />
                                    <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3, fill: '#22d3ee' }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )
            )}
        </div>
    );
}