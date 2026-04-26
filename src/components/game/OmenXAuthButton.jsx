import React, { useState, useEffect } from 'react';
import { omenx, getRedirectUri } from '@/lib/omenx';
import { clearAuthFromIndexedDB } from '@/lib/indexedDbAuth';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'omenx_auth_data';

function getAuthData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed?.walletAddress ? parsed : null;
    } catch { return null; }
}

export default function OmenXAuthButton({ fullWidth = false, onAuthChange }) {
    const [authData, setAuthState] = useState(getAuthData());
    const [base44Authed, setBase44Authed] = useState(false);
    const [checkingBase44, setCheckingBase44] = useState(true);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Check Base44 session
    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            try {
                const isAuthed = await base44.auth.isAuthenticated();
                if (!cancelled) setBase44Authed(!!isAuthed);
            } catch {
                if (!cancelled) setBase44Authed(false);
            } finally {
                if (!cancelled) setCheckingBase44(false);
            }
        };
        check();
        const interval = setInterval(check, 5000); // re-check every 5s to catch login completion
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    const applyAuthData = (data) => {
        if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        else localStorage.removeItem(STORAGE_KEY);
        setAuthState(data);
        setLoading(false);
        if (data) {
            setSuccessMsg(`Wallet connected: ${data.username || data.walletAddress?.slice(0, 8) || 'OmenX'}`);
            setTimeout(() => setSuccessMsg(''), 5000);
        }
        onAuthChange?.(data);
    };

    useEffect(() => {
        const onStorageChange = () => {
            const stored = getAuthData();
            setAuthState(stored);
            setLoading(false);
            if (stored) {
                setSuccessMsg(`Wallet connected: ${stored.username || stored.walletAddress?.slice(0, 8) || 'OmenX'}`);
                setTimeout(() => setSuccessMsg(''), 5000);
            }
            onAuthChange?.(stored);
        };

        const onMessage = (event) => {
            if (event.data?.type === 'omenx_auth' && event.data?.authData) {
                const ad = event.data.authData;
                if (ad?.walletAddress && ad?.accessToken) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(ad));
                    applyAuthData(ad);
                }
            }
        };

        window.addEventListener('storage', onStorageChange);
        window.addEventListener('message', onMessage);
        return () => {
            window.removeEventListener('storage', onStorageChange);
            window.removeEventListener('message', onMessage);
        };
    }, [onAuthChange]);

    const handleBase44SignIn = () => {
        setLoading(true);
        try {
            base44.auth.redirectToLogin(window.location.href);
        } catch {
            setLoading(false);
        }
    };

    const handleConnectWallet = async () => {
        setLoading(true);
        try {
            const redirectUri = getRedirectUri();
            await omenx.authenticate({ redirectUri, enablePKCE: true });
        } catch {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            const { SaveManager } = await import('@/game/SaveManager');
            await SaveManager.syncToBackend();
        } catch (e) {
            console.error('[handleLogout] Failed to flush save:', e.message);
        }

        applyAuthData(null);
        setSuccessMsg('');
        try { await clearAuthFromIndexedDB(); } catch (e) {}
        try { await omenx.logout(); } catch (e) {}
        try { await base44.auth.logout(); } catch (e) {}
        window.location.reload();
    };

    // Determine state
    // 1. checking → loader
    // 2. !base44Authed → "Sign In"
    // 3. base44Authed && !authData → "Connect Wallet"
    // 4. base44Authed && authData → "Logout"
    let label, icon, onClick, theme;
    if (checkingBase44) {
        label = 'Loading…';
        icon = '⏳';
        onClick = () => {};
        theme = 'bg-slate-800/40 border-slate-600/60 text-slate-300';
    } else if (!base44Authed) {
        label = loading ? 'Redirecting…' : 'Sign In';
        icon = '🚀';
        onClick = handleBase44SignIn;
        theme = 'bg-cyan-900/20 hover:bg-cyan-900/40 border-cyan-500/60 hover:border-cyan-400 text-cyan-100 hover:text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]';
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
                disabled={loading || checkingBase44}
                type="button"
                className={`font-black tracking-widest uppercase transition-all border flex items-center justify-center gap-2 backdrop-blur-md pointer-events-auto cursor-pointer ${
                    fullWidth
                        ? 'w-full py-4 md:py-5 text-sm md:text-lg px-4'
                        : 'px-3 py-1.5 rounded-lg text-xs'
                } ${theme}`}
            >
                {loading || checkingBase44
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                    : <span>{icon}</span>
                }
                {label}
            </button>
            {successMsg && (
                <div className="text-[10px] text-green-400 font-bold bg-green-950/50 border border-green-700/50 px-2 py-1 rounded max-w-[240px] text-center truncate">
                    ✓ {successMsg}
                </div>
            )}
        </div>
    );
}