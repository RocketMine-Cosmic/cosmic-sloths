import React, { useEffect, useState } from 'react';
import { Target, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getOmenXUserSync } from '@/lib/omenxUser';

// Floating banner that shows the squad's active daily goal to every member.
// Polls every 60s. Dismissible per-session via sessionStorage so members aren't
// nagged once they've seen it.
export default function DailyGoalBanner() {
    const [goal, setGoal] = useState(null);
    const [squad, setSquad] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const tick = async () => {
            try {
                const user = getOmenXUserSync();
                const wallet = user?.walletAddress;
                if (!wallet) return;
                // Find caller's squad membership.
                const members = await base44.entities.SquadMember.filter({ wallet_address: wallet });
                if (!members || members.length === 0) {
                    if (!cancelled) { setGoal(null); setSquad(null); }
                    return;
                }
                const squadId = members[0].squad_id;
                if (!cancelled) setSquad(squadId);

                const res = await base44.functions.invoke('squadActions', { action: 'getDailyGoal', squadId });
                if (cancelled) return;
                const g = res.data?.goal || null;
                setGoal(g);
                // Reset dismiss when goal id changes (new goal = re-show).
                if (g) {
                    const dismissKey = `daily_goal_dismissed_${g.id}`;
                    setDismissed(sessionStorage.getItem(dismissKey) === '1');
                }
            } catch {}
        };

        tick();
        const interval = setInterval(tick, 60_000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    if (!goal || dismissed) return null;

    const handleDismiss = () => {
        try { sessionStorage.setItem(`daily_goal_dismissed_${goal.id}`, '1'); } catch {}
        setDismissed(true);
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-700/95 via-orange-600/95 to-amber-700/95 border-b border-amber-400/50 shadow-lg backdrop-blur">
            <div className="max-w-5xl mx-auto px-3 py-1.5 md:py-2 flex items-center gap-2 md:gap-3">
                <Target className="w-4 h-4 md:w-5 md:h-5 text-amber-100 shrink-0" />
                <div className="min-w-0 flex-1">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-amber-200 mr-2">Squad Goal</span>
                    <span className="text-xs md:text-sm font-bold text-white truncate">{goal.label}</span>
                </div>
                <span className="hidden md:inline text-[10px] text-amber-200/70">— set by {goal.set_by_name}</span>
                <button
                    onClick={handleDismiss}
                    className="text-amber-100 hover:text-white p-1 rounded shrink-0"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}