import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Omen activity points on Star Ops (added 21 Oct 2026).
// Players earn Omen activity points for finishing the Star Ops cards; this file shows it:
//   - <ActivityPointsStrip />  today / this month, at the top of Star Ops
//   - <ApBadge event="login" /> the "+10 AP" pill on each card (ticked once earned today)
//   - notifyActivityPoints(toast, data.activityPoints) after a claim: toast + refresh the strip
// Server side: functions getMyActivityPoints and shared/omenxPoints.ts. Hidden for players while
// points are switched off; admins see it labelled as a preview.

const EVENT = 'activityPointsUpdated';
let cache = null;
let inflight = null;

async function fetchPoints() {
    if (inflight) return inflight;
    inflight = base44.functions.invoke('getMyActivityPoints', {})
        .then(res => { cache = res?.data || { enabled: false }; return cache; })
        .catch(() => cache || { enabled: false })
        .finally(() => { inflight = null; });
    return inflight;
}

export function useActivityPoints() {
    const [state, setState] = useState(cache);
    useEffect(() => {
        let alive = true;
        fetchPoints().then(d => { if (alive) setState(d); });
        const onUpdate = (e) => {
            cache = { ...(cache || {}), ...(e.detail || {}) };
            setState(cache);
        };
        window.addEventListener(EVENT, onUpdate);
        return () => { alive = false; window.removeEventListener(EVENT, onUpdate); };
    }, []);
    return state;
}

const LABELS = {
    login: 'daily login', bounties: 'all 3 bounties', tasks: 'all daily tasks', mission: 'daily mission',
    streak3: '3-day streak', streak7: '7-day streak', streak14: '14-day streak', streak30: '30-day streak',
};

// Call after any Star Ops claim with the response's `activityPoints`.
export function notifyActivityPoints(toast, ap) {
    if (!ap) return;
    const earned = Array.isArray(ap.earned) ? ap.earned : [];
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { today: ap.today, month: ap.month, earnedToday: ap.earnedToday } }));
    const total = earned.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    if (total > 0 && toast) {
        toast({
            title: `+${total} Omen Activity Points`,
            description: `For ${earned.map(e => LABELS[e.event] || e.event).join(' + ')}. They count towards your Omen leaderboard rank.`,
        });
    }
}

function visible(ap) {
    return !!ap && (ap.enabled || ap.preview);
}

export function ApBadge({ event, suffix }) {
    const ap = useActivityPoints();
    if (!visible(ap)) return null;
    const amount = ap.amounts?.[event];
    if (!amount) return null;
    const done = (ap.earnedToday || []).includes(event);
    return (
        <span
            className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap ${
                done
                    ? 'bg-violet-950/40 text-violet-300/60 border-violet-500/30'
                    : 'bg-violet-900/60 text-violet-200 border-violet-400/60 shadow-[0_0_8px_rgba(139,92,246,0.45)]'
            }`}
            title={done ? 'Omen activity points earned today' : 'Omen activity points — count towards your Omen leaderboard rank'}
        >
            {done ? '✓ ' : '+'}{amount} AP{suffix && !done ? ` · ${suffix}` : ''}
        </span>
    );
}

export function ActivityPointsStrip() {
    const ap = useActivityPoints();
    if (!visible(ap)) return null;
    const s = ap.amounts?.streak || {};
    return (
        <div className="relative overflow-hidden rounded-xl border border-violet-500/50 bg-gradient-to-r from-violet-950/80 via-[#0b0416]/80 to-indigo-950/80 shadow-[0_0_25px_rgba(139,92,246,0.25)] px-3 py-2.5 md:px-4 md:py-3 mb-2 md:mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5 md:gap-4">
                <div>
                    <div className="text-xs md:text-sm font-black uppercase tracking-widest text-violet-300 flex items-center gap-2">
                        Omen Activity Points
                        {ap.preview && (
                            <span className="text-[9px] font-bold normal-case tracking-normal text-amber-300 border border-amber-500/50 bg-amber-950/50 px-1.5 py-0.5 rounded">
                                admin preview — off for players
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] md:text-xs text-slate-400 mt-0.5">
                        Earn them on every card below — they count towards your Omen leaderboard rank.
                        {s[3] ? ` Login streak bonus at 3 / 7 / 14 / 30 days (+${s[3]} / +${s[7]} / +${s[14]} / +${s[30]}).` : ''}
                    </div>
                </div>
                <div className="flex items-baseline gap-4 shrink-0">
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Today</div>
                        <div className="text-lg md:text-xl font-black text-violet-200 leading-none">{ap.today || 0}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">This month</div>
                        <div className="text-lg md:text-xl font-black text-violet-200 leading-none">{ap.month || 0}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
