import React, { useState, useEffect } from 'react';
import { omenx } from '@/lib/omenx';

export default function OmenXAuthButton({ fullWidth = false }) {
    const [authData, setAuthData] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Reflect current session on mount (init() already called in App.jsx)
        setAuthData(omenx.getAuthData());
    }, []);



    const handleClick = async () => {
        if (authData) {
            await omenx.logout();
            setAuthData(null);
            setSuccessMsg('');
        } else {
            setLoading(true);
            try {
                await omenx.authenticate({
                    redirectUri: 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback',
                    enablePKCE: true,
                });
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
        <div className={`flex flex-col ${fullWidth ? 'items-center w-full' : 'items-end'} gap-1`}>
            <button
                onClick={handleClick}
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