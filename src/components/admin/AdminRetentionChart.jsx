import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminRetentionChart({ walletAddress }) {
    const { data, isLoading } = useQuery({
        queryKey: ['adminRetention', walletAddress],
        queryFn: async () => {
            // Fetch all scores sorted by created_date to detect return visits
            const scores = (await base44.functions.invoke('getAdminDataExtended', {
                type: 'scores', period: 'all'
            })).data?.scores ?? [];

            // Group scores by wallet, find first play date per wallet
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
                return {
                    label,
                    pct: Math.round((returned / total) * 100),
                    count: returned,
                };
            });

            return { retention, total };
        },
        enabled: !!walletAddress,
    });

    const COLORS = ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75'];

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs">
                <div className="font-bold text-white">{d.label} Retention</div>
                <div className="text-cyan-400">{d.pct}% ({d.count} players)</div>
                <div className="text-slate-400">of {data?.total} total</div>
            </div>
        );
    };

    return (
        <div className="bg-[#0b0416]/80 border border-cyan-900/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Player Retention</h3>
                {data?.total !== undefined && (
                    <span className="text-[10px] text-slate-500">{data.total} unique players</span>
                )}
            </div>
            <div className="text-[10px] text-slate-500 mb-3">% of players who returned and played again within that day window</div>

            {isLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-cyan-500"></div></div>
            ) : !data?.retention?.length ? (
                <div className="text-slate-500 text-sm text-center py-8">Not enough data yet.</div>
            ) : (
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.retention} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                            <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="pct" name="Retention %" radius={[4, 4, 0, 0]}>
                                {(data.retention || []).map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}