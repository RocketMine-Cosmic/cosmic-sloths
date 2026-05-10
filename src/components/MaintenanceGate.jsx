import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Wrench } from 'lucide-react';

// Wraps the app and shows either a top banner ('soft') or a full-screen overlay
// blocking /game ('hard'). Polls every 30s. Fails OPEN — if the function errors
// we treat it as 'off' so a backend hiccup never locks players out.
//
// Soft = "rollover incoming, finish your run" — game still playable.
// Hard = "rollover in progress" — /game route blocked, but players can stay on
//        any other page (squads, chat, leaderboard, profile).
export default function MaintenanceGate() {
    const [state, setState] = useState({ mode: 'off', message: '' });
    // Admins bypass the HARD gate so they can smoke-test runs during a rollover
    // (otherwise nobody could verify the rollover worked). Checked once on mount —
    // role doesn't change mid-session. Falls back to non-admin on any error.
    const [isAdmin, setIsAdmin] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        const fetchState = async () => {
            try {
                const res = await base44.functions.invoke('getMaintenanceMode', {});
                if (cancelled) return;
                if (res.data && typeof res.data.mode === 'string') {
                    setState({ mode: res.data.mode, message: res.data.message || '' });
                }
            } catch {
                // fail open
            }
        };
        fetchState();
        const t = setInterval(fetchState, 30_000);

        // One-shot admin check.
        base44.auth.me()
            .then(u => { if (!cancelled) setIsAdmin(u?.role === 'admin'); })
            .catch(() => { /* not signed in or call failed — treat as non-admin */ });

        return () => { cancelled = true; clearInterval(t); };
    }, []);

    // If hard mode and player is on /game, push them out so they can't start a run.
    // Admins are exempt — they need /game accessible to verify the rollover worked.
    useEffect(() => {
        if (state.mode === 'hard' && location.pathname === '/game' && !isAdmin) {
            navigate('/hub', { replace: true });
        }
    }, [state.mode, location.pathname, navigate, isAdmin]);

    if (state.mode === 'off') return null;

    // Admins see a small persistent pill instead of the SOFT banner / HARD overlay
    // so the maintenance state is still visible (they shouldn't forget to flip OFF)
    // but the game stays fully playable for smoke tests.
    if (isAdmin) {
        return (
            <div className="fixed bottom-2 right-2 z-[9999] bg-amber-600/95 text-white text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-md shadow-lg flex items-center gap-1.5 border border-amber-300/60">
                <Wrench className="w-3 h-3 shrink-0" />
                <span>ADMIN BYPASS · Gate is {state.mode.toUpperCase()}</span>
            </div>
        );
    }

    if (state.mode === 'soft') {
        // Hide entirely during active gameplay — the banner overlapping HUD/joystick
        // was too intrusive mid-run. Players see it on every other page (hub, squads,
        // leaderboard, etc.) so they're still informed.
        if (location.pathname === '/game') return null;
        // Bottom-anchored so it doesn't overlap the WarpMenu / top nav, and
        // pointer-events-none so it never blocks clicks on whatever sits behind
        // it (the banner itself has no interactive elements).
        return (
            <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-amber-600/95 text-white text-center text-xs md:text-sm font-bold px-3 py-2 shadow-lg flex items-center justify-center gap-2 backdrop-blur-sm pointer-events-none">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="truncate">{state.message || 'Season 6 rollout coming soon — finish your run before launch.'}</span>
            </div>
        );
    }

    // hard
    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#0b0416] border-2 border-amber-500 rounded-xl p-6 md:p-8 text-center shadow-[0_0_40px_rgba(245,158,11,0.3)]">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Wrench className="w-8 h-8 text-amber-300 animate-pulse" />
                    </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-amber-300 mb-3">
                    Season 6 Rollout
                </h1>
                <p className="text-slate-200 text-sm md:text-base mb-4 leading-relaxed">
                    {state.message || 'The game is briefly closed for the seasonal rollover. Please check back shortly.'}
                </p>
                <p className="text-xs text-slate-400 italic">
                    The page will refresh automatically when the rollover is complete.
                </p>
                <a
                    href="/admin"
                    className="mt-4 inline-block text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest"
                >
                    admin
                </a>
            </div>
        </div>
    );
}