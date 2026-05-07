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
        return () => { cancelled = true; clearInterval(t); };
    }, []);

    // If hard mode and player is on /game, push them out so they can't start a run.
    // (Mid-run players see the overlay too — they can still read but the gameplay
    // canvas is covered.)
    useEffect(() => {
        if (state.mode === 'hard' && location.pathname === '/game') {
            navigate('/hub', { replace: true });
        }
    }, [state.mode, location.pathname, navigate]);

    if (state.mode === 'off') return null;

    if (state.mode === 'soft') {
        return (
            <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600/95 text-white text-center text-xs md:text-sm font-bold px-3 py-2 shadow-lg flex items-center justify-center gap-2 backdrop-blur-sm">
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
            </div>
        </div>
    );
}