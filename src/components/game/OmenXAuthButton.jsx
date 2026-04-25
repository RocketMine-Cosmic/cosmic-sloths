import React, { useState, useEffect } from 'react';
import { omenx } from '@/lib/omenx';
import { clearAuthFromIndexedDB, saveAuthToIndexedDB, getAuthFromIndexedDB } from '@/lib/indexedDbAuth';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'omenx_auth_data';

function getAuthData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        // Validate required fields
        return parsed?.walletAddress ? parsed : null;
    } catch { return null; }
}

// Check URL params for OmenX recovery (post-Base44-redirect)
async function recoverFromUrlOrIndexedDB() {
    const params = new URLSearchParams(window.location.search);
    const walletFromUrl = params.get('omenx_wallet');
    const tokenFromUrl = params.get('omenx_token');
    
    if (walletFromUrl && tokenFromUrl) {
        try {
            const recovered = { walletAddress: walletFromUrl, accessToken: tokenFromUrl };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(recovered));
            await saveAuthToIndexedDB(recovered);
            // Clean URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            return recovered;
        } catch (e) {
            console.error('[OmenX] URL recovery failed:', e);
        }
    }
    
    // Fall back to IndexedDB if localStorage is empty
    const lsAuth = getAuthData();
    if (lsAuth) return lsAuth;
    
    const dbAuth = await getAuthFromIndexedDB();
    if (dbAuth?.walletAddress) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dbAuth));
        return dbAuth;
    }
    
    return null;
}

export default function OmenXAuthButton({ fullWidth = false, onAuthChange }) {
    const [authData, setAuthState] = useState(getAuthData());
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    
    // On mount, try recovery from URL or IndexedDB
    useEffect(() => {
        const recover = async () => {
            const recovered = await recoverFromUrlOrIndexedDB();
            if (recovered && !authData) {
                setAuthState(recovered);
                onAuthChange?.(recovered);
            }
        };
        recover();
    }, []);

    const applyAuthData = async (data) => {
        if (data) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            await saveAuthToIndexedDB(data);
            
            // Send refresh token to backend for storage
            if (data.refreshToken) {
                try {
                    await base44.functions.invoke('syncOmenXWallet', {
                        walletAddress: data.walletAddress,
                        refreshToken: data.refreshToken
                    });
                } catch (e) {
                    console.error('[OmenXAuthButton] Failed to sync refresh token:', e);
                }
            }
        } else {
            localStorage.removeItem(STORAGE_KEY);
            await clearAuthFromIndexedDB();
        }
        setAuthState(data);
        setLoading(false);
        if (data) {
            setSuccessMsg(`Connected as ${data.username || data.walletAddress || 'OmenX User'}`);
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
                setSuccessMsg(`Connected as ${stored.username || stored.walletAddress || 'OmenX User'}`);
                setTimeout(() => setSuccessMsg(''), 5000);
            }
            onAuthChange?.(stored);
        };

        const onMessage = async (event) => {
            if (event.data?.type === 'omenx_auth' && event.data?.authData) {
                const authData = event.data.authData;
                // Validate before accepting from postMessage
                if (authData?.walletAddress && authData?.accessToken) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
                    applyAuthData(authData);
                    
                    // Wallet is now in localStorage, AuthGate will sync it after Base44 auth completes
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

    const handleLogin = async () => {
        setLoading(true);
        try {
            console.log('[OmenXAuthButton] Calling omenx.authenticate...');
            await omenx.authenticate({ redirectUri: 'https://cosmic-sloths.com/auth/callback' });
            console.log('[OmenXAuthButton] authenticate() returned');
            // onAuth callback will fire and sync wallet to Base44
        } catch (err) {
            console.error('[OmenXAuthButton] authenticate() failed:', err.message, err);
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        // Flush any pending save to backend before logout
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
        window.location.reload();
    };

    return (
        <div className={`flex flex-col ${fullWidth ? 'items-center w-full' : 'items-end'} gap-1`}>
            <button
                onClick={(e) => { 
                    console.log('[OmenXAuthButton] onclick fired', e);
                    (authData ? handleLogout : handleLogin)();
                }}
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