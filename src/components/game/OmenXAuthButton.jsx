import React, { useState, useEffect } from 'react';
import { omenx } from '@/lib/omenx';

const STORAGE_KEY = 'omenx_auth_data';

function getAuthData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

export default function OmenXAuthButton({ fullWidth = false, onAuthChange }) {
    const [authData, setAuthState] = useState(getAuthData());
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        // Listen for auth changes from SDK's onAuth callback
        const handleStorageChange = (e) => {
            if (e.key === STORAGE_KEY) {
                const newAuth = e.newValue ? JSON.parse(e.newValue) : null;
                setAuthState(newAuth);
                setLoading(false);
                if (newAuth) {
                    setSuccessMsg(`Connected as ${newAuth.username || newAuth.walletAddress}`);
                    setTimeout(() => setSuccessMsg(''), 5000);
                    onAuthChange?.(newAuth);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [onAuthChange]);

    const handleLogin = async () => {
        setLoading(true);
        try {
            console.log('[OmenXAuthButton] Starting authentication...');
            console.log('[OmenXAuthButton] SDK isAuthenticated:', omenx.isAuthenticated());
            const result = await omenx.authenticate({ enablePKCE: true });
            console.log('[OmenXAuthButton] Auth result:', result);
        } catch (err) {
            console.error('[OmenXAuthButton] Auth failed:', err);
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await omenx.logout();
            localStorage.removeItem(STORAGE_KEY);
            setAuthState(null);
        } catch (e) {
            console.error('[OmenXAuthButton] Logout failed:', e);
        }
        window.location.reload();
    };

    return (
        <div className={`flex flex-col ${fullWidth ? 'items-center w-full' : 'items-end'} gap-1`}>
            <button
                onClick={authData ? handleLogout : handleLogin}
                disabled={loading}
                type="button"
                className={`font-black tracking-widest uppercase transition-all border flex items-center justify-center gap-2 backdrop-blur-md pointer-events-auto cursor-pointer ${
                    fullWidth
                        ? 'w-full py-4 md:py-5 text-sm md:text-lg px-4'
                        : 'px-3 py-1.5 rounded-lg text-xs'
                } ${
                    authData
                        ? 'bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 border-[#F59E0B]/60 hover:border-[#F59E0B] text-amber-100 hover:text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                        : 'bg-purple-900/20 hover:bg-purple-900/40 border-purple-500/60 hover:border-purple-400 text-purple-100 hover:text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]'
                }`}
            >
                {loading ? (
                    <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                    <span>{authData ? '⚡' : '🔗'}</span>
                )}
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