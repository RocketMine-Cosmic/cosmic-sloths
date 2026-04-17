import React, { useState, useEffect } from 'react';
import { omenx, getRedirectUri } from '@/lib/omenx';

const STORAGE_KEY = 'omenx_auth_data';

function getAuthData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

export default function OmenXAuthButton({ fullWidth = false, onAuthChange }) {
    const [authData, setAuthState] = useState(getAuthData);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [debugMsg, setDebugMsg] = useState('');

    const applyAuthData = (data) => {
        if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        else localStorage.removeItem(STORAGE_KEY);
        setAuthState(data);
        setLoading(false);
        if (data) {
            setSuccessMsg(`Connected as ${data.username || data.walletAddress || 'OmenX User'}`);
            setTimeout(() => setSuccessMsg(''), 5000);
        }
        onAuthChange?.(data);
    };

    useEffect(() => {
        // Listen for SDK onAuth callback writing to localStorage
        const onStorageChange = () => {
            const stored = getAuthData();
            setAuthState(stored);
            setLoading(false);
            if (stored) {
                setSuccessMsg(`Connected as ${stored.username || stored.walletAddress || 'OmenX User'}`);
                setTimeout(() => setSuccessMsg(''), 5000);
            }
            onAuthChange?.(stored);
        };
        
        window.addEventListener('storage', onStorageChange);
        return () => window.removeEventListener('storage', onStorageChange);
    }, [onAuthChange]);

    const handleLogin = async () => {
        setLoading(true);
        setDebugMsg('Opening popup...');
        try {
            await omenx.authenticate({
                redirectUri: getRedirectUri(),
                enablePKCE: true,
            });
            setDebugMsg('Waiting for callback...');
        } catch (err) {
            setDebugMsg(`Error: ${err.message}`);
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        applyAuthData(null);
        setSuccessMsg('');
        try {
            await omenx.logout();
        } catch (e) {
            console.error('[OmenX] logout error', e);
        }
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
            {debugMsg && (
                <div className="text-[9px] text-yellow-400 font-bold bg-yellow-950/50 border border-yellow-700/50 px-2 py-1 rounded max-w-[200px] text-right truncate">
                    {debugMsg}
                </div>
            )}
        </div>
    );
}