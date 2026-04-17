import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

export function useOmenXBalance() {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef(null);

    const fetchBalance = useCallback(async () => {
        const auth = getAuthData();
        if (!auth?.walletAddress || !auth?.access_token) {
            setBalance(null);
            setLoading(false);
            return;
        }

        try {
            const res = await base44.functions.invoke('getOmenXBalance', { walletAddress: auth.walletAddress, accessToken: auth.access_token });
            setBalance(res.data?.balance ?? null);
        } catch (e) {
            console.error('[useOmenXBalance] failed:', e);
            setBalance(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchBalance();
        intervalRef.current = setInterval(fetchBalance, 20_000);

        const onStorage = (e) => { if (e.key === 'omenx_auth_data') fetchBalance(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener('focus', fetchBalance);

        return () => {
            clearInterval(intervalRef.current);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('focus', fetchBalance);
        };
    }, [fetchBalance]);

    return { balance, loading, refresh: fetchBalance };
}