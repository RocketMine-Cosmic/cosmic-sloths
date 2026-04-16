/**
 * useOmenXBalance — fetches the user's OMENX token balance from OmenX API.
 * In OmenX-only mode, bypasses Base44 backend entirely.
 *
 * Returns: { balance: number | null, loading: boolean, refresh: () => void }
 */
import { useState, useEffect, useCallback, useRef } from 'react';

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
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
        if (!walletAddress) {
            setLoading(false);
            return;
        }

        try {
            // Call OmenX API directly (no Base44 backend needed)
            const res = await fetch(`https://staging.api.omen.foundation/v1/players/${walletAddress}/balances?chainId=56`, {
                headers: {
                    'Authorization': `Bearer ${auth.access_token}`,
                }
            });
            if (!res.ok) {
                console.warn('[useOmenXBalance] API returned', res.status);
                setLoading(false);
                return;
            }
            const data = await res.json();
            const bal = data.balance ?? data.omenx ?? 0;
            setBalance(typeof bal === 'number' ? bal : 0);
        } catch (e) {
            console.error('[useOmenXBalance] fetch error', e);
            setBalance(0);
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