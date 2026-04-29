import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Coins } from 'lucide-react';

const STAFF_PCT_PER_WALLET = 0.02; // matches distributeRewards.js

function getCurrentWeekId() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${year}-W${String(isoWeek).padStart(2, '0')}`;
}

// Compact live card — shows the signed-in staff member their own projected weekly OMENX
// based on the current weekly token pool. Refreshes every 30s.
export default function MyStaffIncomeCard({ walletAddress, isEmergencyKey }) {
    const currentWeekId = getCurrentWeekId();

    const { data: pools = [], isLoading } = useQuery({
        queryKey: ['myStaffIncomePool', currentWeekId],
        queryFn: () => base44.functions.invoke('getAdminData', { type: 'pools' }).then(r => r.data?.pools || []),
        refetchInterval: 30000,
        refetchOnWindowFocus: true,
    });

    if (isEmergencyKey || !walletAddress) return null;

    const currentPool = pools.find(p => p.period_type === 'weekly' && p.period_id === currentWeekId);
    const currentSpent = currentPool?.total_spent || 0;
    const projected = Math.floor(currentSpent * STAFF_PCT_PER_WALLET);

    return (
        <div className="bg-gradient-to-r from-amber-950/60 to-slate-900/60 border border-amber-700/40 rounded-lg px-3 py-1.5 flex items-center gap-3 shrink-0">
            <Coins size={14} className="text-amber-400 shrink-0" />
            <div className="flex flex-col leading-tight">
                <span className="text-[9px] text-amber-300/70 uppercase tracking-wider font-bold">Your week ({currentWeekId})</span>
                <span className="text-sm font-mono font-black text-amber-300">
                    {isLoading ? '…' : `${projected.toLocaleString()} OMENX`}
                </span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono hidden md:inline">live · 2% of {currentSpent.toFixed(1)}</span>
        </div>
    );
}