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

        const walletAddress = auth.walletAddress || auth.wallet_address;

        if (walletAddress) {
            try {
                const res = await base44.functions.invoke('getOmenXBalance', {
                    walletAddress,
                    chainId: '56'
                });
                const bal = extractBalance(res.data);
                setBalance(bal);
                setLoading(false);
            } catch (e) {
                console.error('[useOmenXBalance] fetch error', e);
                setLoading(false);
            }
            return;
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchBalance();
        // Poll every 20s for live updates
        intervalRef.current = setInterval(fetchBalance, 20_000);

        // Re-fetch when auth changes
        const onStorage = (e) => {
            if (e.key === 'omenx_auth_data') fetchBalance();
        };
        window.addEventListener('storage', onStorage);

        // Re-fetch on focus
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