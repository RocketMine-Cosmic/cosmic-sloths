import React, { useState, useEffect } from 'react';

const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';
const CLIENT_ID = 'cosmic-sloths';
const AUTH_URL = `https://staging.api.omen.foundation/v1/oauth/authorize`;

const STORAGE_KEY = 'omenx_auth_data';

function getAuthData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function setAuthData(data) {
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORAGE_KEY);
}

export default function OmenXAuthButton({ fullWidth = false, onAuthChange }) {
    const [authData, setAuthState] = useState(getAuthData);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const applyAuthData = (data) => {
        setAuthData(data);
        setAuthState(data);
        setLoading(false);
        if (data) {
            setSuccessMsg(`Connected as ${data.username || data.walletAddress || 'OmenX User'}`);
            setTimeout(() => setSuccessMsg(''), 5000);
        }
        onAuthChange?.(data);
    };

    useEffect(() => {
        // postMessage from popup
        const handler = (e) => {
            if (e.origin !== window.location.origin) return;
            if (e.data?.type === 'OMENX_AUTH_SUCCESS') applyAuthData(e.data.payload);
            if (e.data?.type === 'OMENX_AUTH_ERROR') { console.error('[OmenX] auth error', e.data.error); setLoading(false); }
        };
        window.addEventListener('message', handler);

        // storage event from OTHER tabs/windows writing to localStorage
        const storageHandler = (e) => {
            if (e.key === STORAGE_KEY) {
                const data = e.newValue ? JSON.parse(e.newValue) : null;
                setAuthState(data);
                onAuthChange?.(data);
            }
        };
        window.addEventListener('storage', storageHandler);

        // Clear auth on window unload (page/browser close)
        const unloadHandler = () => {
            setAuthData(null);
        };
        window.addEventListener('beforeunload', unloadHandler);

        return () => {
            window.removeEventListener('message', handler);
            window.removeEventListener('storage', storageHandler);
            window.removeEventListener('beforeunload', unloadHandler);
        };
    }, []);

    const handleLogin = () => {
        const state = Math.random().toString(36).slice(2);
        localStorage.setItem('omenx_state', state);
        const url = `${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=${state}`;
        const popup = window.open(url, 'omenx_auth', 'width=500,height=700');
        if (!popup) { console.error('[OmenX] popup blocked'); return; }
        setLoading(true);
        // Poll for popup close, then sync state from localStorage
        const timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                const stored = getAuthData();
                applyAuthData(stored);
            }
        }, 500);
    };

    const handleLogout = () => {
        applyAuthData(null);
        setSuccessMsg('');
        window.location.reload();
    };

    return (
        <div className={`flex flex-col ${fullWidth ? 'items-center w-full' : 'items-end'} gap-1`}>
            <button
                onClick={authData ? handleLogout : handleLogin}
                disabled={loading}
                className={`font-black tracking-widest uppercase transition-all border flex items-center justify-center gap-2 backdrop-blur-md ${
                    fullWidth
                        ? 'w-full py-4 md:py-5 text-sm md:text-lg px-4'
                        : 'px-3 py-1.5 rounded-lg text-xs'
                } ${
                    authData
                        ? 'bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 border-[#F59E0B]/60 hover:border-[#F59E0B] text-amber-100 hover:text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                        : 'bg-purple-900/20 hover:bg-purple-900/40 border-purple-500/60 hover:border-purple-400 text-purple-100 hover:text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]'
                }`}
            >
                {loading
                    ? <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block" />
                    : <span>{authData ? '⚡' : '🔗'}</span>
                }
                {loading ? 'Connecting…' : authData ? 'OmenX — Logout' : 'Login with OmenX'}
            </button>
            {successMsg && (
                <div className="text-[10px] text-green-400 font-bold bg-green-950/50 border border-green-700/50 px-2 py-1 rounded max-w-[200px] text-right truncate">
                    ✓ {successMsg}
                </div>
            )}
        </div>
    );
}