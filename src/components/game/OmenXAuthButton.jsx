import React, { useState, useEffect } from 'react';
import { omenx } from '@/lib/omenx';

export default function OmenXAuthButton() {
    const [authData, setAuthData] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Reflect current session on mount (init() already called in App.jsx)
        setAuthData(omenx.getAuthData());
    }, []);

    // Keep in sync with sdk lifecycle callbacks
    useEffect(() => {
        const origOnAuth = omenx.config?.onAuth;
        const origOnLogout = omenx.config?.onLogout;
        // Poll-free: re-check after any known state change
    }, []);

    const handleClick = async () => {
        if (authData) {
            await omenx.logout();
            setAuthData(null);
            setSuccessMsg('');
        } else {
            setLoading(true);
            try {
                await omenx.authenticate();
                const data = omenx.getAuthData();
                setAuthData(data);
                if (data) {
                    setSuccessMsg(`Connected as ${data.username || data.walletAddress || 'OmenX User'}`);
                    setTimeout(() => setSuccessMsg(''), 5000);
                }
            } catch (err) {
                console.error('[OmenX] authenticate error', err);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs tracking-widest uppercase transition-all border flex items-center gap-2 ${
                    authData
                        ? 'bg-red-900/40 hover:bg-red-900/70 border-red-500/60 text-red-300 hover:text-red-100'
                        : 'bg-purple-900/40 hover:bg-purple-900/70 border-purple-500/60 text-purple-300 hover:text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                }`}
            >
                {loading ? (
                    <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                    <span>{authData ? '⚡' : '🔗'}</span>
                )}
                {loading ? 'Connecting…' : authData ? 'OmenX Logout' : 'Login with OmenX'}
            </button>
            {successMsg && (
                <div className="text-[10px] text-green-400 font-bold bg-green-950/50 border border-green-700/50 px-2 py-1 rounded max-w-[200px] text-right truncate">
                    ✓ {successMsg}
                </div>
            )}
        </div>
    );
}