import React, { useState, useEffect } from 'react';
import { omenx } from '@/lib/omenx';
import { connectOmenWallet } from '@/lib/omenxRedirectAuth';
import { clearOmenAuth } from '@/lib/omenAuthStore';
import { base44 } from '@/api/base44Client';
import { useOmenXAuth } from '@/lib/OmenXAuthContext';
import { signInBase44, base44SignInLabel } from '@/lib/frameAuth';
import { useArcadeWaiting, connectErrorText, inArcadeFrame } from '@/lib/useArcadeWaiting';
import ArcadeSignInNotice from '@/components/game/ArcadeSignInNotice';

export default function OmenXAuthButton({ fullWidth = false, onAuthChange }) {
    // Pull from shared context — no per-button `me` call (was running on every page mount).
    const { authData, base44Authed } = useOmenXAuth();
    const checkingBase44 = base44Authed === null;
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    // Inside the Omen Arcade: wait for the Arcade's sign-in instead of showing Connect Wallet.
    const arcadeWaiting = useArcadeWaiting(!!authData);

    useEffect(() => {
        if (authData) setLoading(false);
        onAuthChange?.(authData || null);
    }, [authData]); // eslint-disable-line react-hooks/exhaustive-deps

    const flash = (text, ms) => {
        setSuccessMsg(text);
        if (text) setTimeout(() => setSuccessMsg(''), ms);
    };

    const handleBase44SignIn = async () => {
        setLoading(true);
        try {
            // In its own tab: full-page redirect, as before. Inside the Omen
            // Arcade frame: Base44's login page in a popup (F-002).
            const result = signInBase44();
            if (result && typeof result.then === 'function') await result;
            // If we're still here after a brief moment, something went wrong with
            // the redirect — reset so the user can retry.
            setTimeout(() => setLoading(false), 4000);
        } catch (err) {
            console.error('[OmenXAuthButton] sign-in failed:', err);
            setLoading(false);
            if (err?.message === 'popup_blocked') {
                flash('Sign in didn\'t open. Please allow pop-ups and tap Sign In again.', 8000);
            }
        }
    };

    const handleConnectWallet = async () => {
        setLoading(true);
        setSuccessMsg('');
        try {
            const data = await connectOmenWallet(); // popup; same-tab on the website if blocked
            if (!data) return; // navigating away (same-tab sign-in)
            setLoading(false);
            flash(`Wallet connected: ${data.username || data.walletAddress?.slice(0, 8) || 'Omen Arcade'}`, 5000);
        } catch (err) {
            console.error('[OmenXAuthButton] connect failed:', err?.message);
            setLoading(false);
            flash(connectErrorText(err), 8000);
        }
    };

    const handleLogout = async () => {
        try {
            const { SaveManager } = await import('@/game/SaveManager');
            await SaveManager.syncToBackend();
        } catch (e) {
            console.error('[handleLogout] Failed to flush save:', e.message);
        }

        setSuccessMsg('');
        clearOmenAuth();
        try { await omenx.logout(); } catch (e) {}
        try { await base44.auth.logout(); } catch (e) {}
        window.location.reload();
    };

    // Inside the Omen Arcade, signed in to Base44, no Omen sign-in from the Arcade after the wait:
    // no Connect Wallet button (it can't work in a frame) — point the player at the Arcade instead.
    if (base44Authed && !authData && !arcadeWaiting && inArcadeFrame()) {
        return (
            <div className={`flex flex-col ${fullWidth ? 'items-center w-full py-2' : 'items-end'}`}>
                <ArcadeSignInNotice compact={!fullWidth} />
            </div>
        );
    }

    // Determine state
    // 1. checking → loader
    // 2. !base44Authed → "Sign In"
    // 3. base44Authed && !authData → "Connect Wallet" (inside the Arcade: wait for its sign-in first)
    // 4. base44Authed && authData → "Logout"
    let label, icon, onClick, theme;
    const waiting = checkingBase44 || (base44Authed && !authData && arcadeWaiting);
    if (checkingBase44) {
        label = 'Loading…';
        icon = '⏳';
        onClick = () => {};
        theme = 'bg-slate-800/40 border-slate-600/60 text-slate-300';
    } else if (!base44Authed) {
        label = loading ? 'Signing in…' : base44SignInLabel(authData);
        icon = '🚀';
        onClick = handleBase44SignIn;
        theme = 'bg-cyan-900/20 hover:bg-cyan-900/40 border-cyan-500/60 hover:border-cyan-400 text-cyan-100 hover:text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]';
    } else if (!authData && arcadeWaiting) {
        label = 'Connecting via Omen Arcade…';
        icon = '🔗';
        onClick = () => {};
        theme = 'bg-purple-900/20 border-purple-500/40 text-purple-200';
    } else if (!authData) {
        label = loading ? 'Connecting…' : 'Connect Wallet';
        icon = '🔗';
        onClick = handleConnectWallet;
        theme = 'bg-purple-900/20 hover:bg-purple-900/40 border-purple-500/60 hover:border-purple-400 text-purple-100 hover:text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]';
    } else {
        label = 'Logout';
        icon = '⚡';
        onClick = handleLogout;
        theme = 'bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 border-[#F59E0B]/60 hover:border-[#F59E0B] text-amber-100 hover:text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]';
    }

    return (
        <div className={`flex flex-col ${fullWidth ? 'items-center w-full' : 'items-end'} gap-1`}>
            <button
                onClick={onClick}
                disabled={loading || waiting}
                type="button"
                className={`font-black tracking-widest uppercase transition-all border flex items-center justify-center gap-2 backdrop-blur-md pointer-events-auto cursor-pointer ${
                    fullWidth
                        ? 'w-full py-4 md:py-5 text-sm md:text-lg px-4'
                        : 'px-3 py-1.5 rounded-lg text-xs'
                } ${theme}`}
            >
                {loading || waiting
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                    : <span>{icon}</span>
                }
                {label}
            </button>
            {successMsg && (
                <div className={`text-[10px] font-bold px-2 py-1 rounded max-w-[240px] text-center border ${
                    successMsg.startsWith('Wallet connected')
                        ? 'text-green-400 bg-green-950/50 border-green-700/50 truncate'
                        : 'text-amber-300 bg-amber-950/50 border-amber-700/50'
                }`}>
                    {successMsg.startsWith('Wallet connected') ? `✓ ${successMsg}` : `⚠ ${successMsg}`}
                </div>
            )}
        </div>
    );
}
