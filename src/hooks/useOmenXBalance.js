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
            setBalance(null);
            setLoading(false);
            return;
        }

        // In OmenX-only mode, balance is unavailable (would need server-side query)
        // Just show null as "unknown" rather than making failing API calls
        setBalance(null);
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