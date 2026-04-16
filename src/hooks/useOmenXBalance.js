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
            // Try multiple API endpoints to find balance
            console.log('[useOmenXBalance] Fetching for wallet:', walletAddress);
            
            const endpoints = [
                `https://staging.api.omen.foundation/v1/players/${walletAddress}/balances`,
                `https://staging.api.omen.foundation/v1/wallets/${walletAddress}/balance`,
                `https://staging.api.omen.foundation/v1/players/${walletAddress}`,
            ];

            for (const endpoint of endpoints) {
                try {
                    const res = await fetch(endpoint, {
                        headers: {
                            'Authorization': `Bearer ${auth.access_token}`,
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        console.log('[useOmenXBalance] Response from', endpoint, data);
                        const bal = data.balance ?? data.omenx ?? data.sparks ?? 0;
                        setBalance(typeof bal === 'number' ? bal : 0);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    // Try next endpoint
                    console.debug('[useOmenXBalance] Endpoint failed:', endpoint, e.message);
                }
            }
            
            console.warn('[useOmenXBalance] All endpoints failed');
            setBalance(0);
        } catch (e) {
            console.error('[useOmenXBalance] unexpected error', e);
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