/**
 * useOmenXBalance — fetches the user's OMENX token balance.
 * Tries the OmenX API directly first (via the SDK's apiCall),
 * then falls back to a backend function that uses the server SDK.
 *
 * Returns: { balance: number | null, loading: boolean, refresh: () => void }
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { omenx } from '@/lib/omenx';
import { base44 } from '@/api/base44Client';

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

function extractBalance(data) {
    if (!data) return null;
    const bal = data.balance ?? data.omenx ?? data.sparks
        ?? data.tokens ?? data.amount
        ?? data.wallet?.balance ?? data.wallet?.omenx
        ?? data.user?.balance ?? null;
    return typeof bal === 'number' ? bal : null;
}

export function useOmenXBalance() {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef(null);

    const fetchBalance = useCallback(async () => {
        const auth = getAuthData();
        if (!auth) {
            setLoading(false);
            return;
        }

        const token = auth.access_token || auth.accessToken;
        const walletAddress = auth.walletAddress || auth.wallet_address;

        // 1. Try direct OmenX API calls with user's OAuth token
        if (token) {
            const BASE = 'https://staging.api.omen.foundation';
            const endpoints = ['/v1/wallet', '/v1/users/me/wallet', '/v1/users/me', '/v1/profile'];
            for (const ep of endpoints) {
                try {
                    const res = await fetch(`${BASE}${ep}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const bal = extractBalance(data);
                        if (bal !== null) {
                            setBalance(bal);
                            setLoading(false);
                            return;
                        }
                    }
                } catch {}
            }
        }

        // 2. Fall back to backend function (server SDK, uses API key)
        if (walletAddress) {
            try {
                const res = await base44.functions.invoke('getOmenXBalance', {
                    walletAddress,
                    chainId: '56'
                });
                const bal = extractBalance(res.data);
                if (bal !== null) {
                    setBalance(bal);
                    setLoading(false);
                    return;
                }
            } catch (e) {
                console.error('[useOmenXBalance] backend fallback error', e);
            }
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchBalance();
        // Poll every 30s
        intervalRef.current = setInterval(fetchBalance, 30_000);

        // Re-fetch when auth state changes (login/logout in another tab)
        const onStorage = (e) => {
            if (e.key === 'omenx_auth_data') fetchBalance();
        };
        window.addEventListener('storage', onStorage);

        // Re-fetch on window focus
        const onFocus = () => fetchBalance();
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(intervalRef.current);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('focus', onFocus);
        };
    }, [fetchBalance]);

    return { balance, loading, refresh: fetchBalance };
}