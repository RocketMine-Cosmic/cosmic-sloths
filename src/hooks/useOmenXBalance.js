import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Singleton cache — shared across all hook instances
let cachedBalance = null;
let listeners = new Set();
let pollTimer = null;

function notify() {
    listeners.forEach(fn => fn(cachedBalance));
}

async function startPolling() {
    if (pollTimer) return;
    
    const poll = async () => {
        try {
            const authData = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
            if (!authData?.walletAddress) return;
            
            const res = await base44.functions.invoke('getOmenXBalance', { walletAddress: authData.walletAddress });
            cachedBalance = res.data?.balance ?? 0;
            notify();
        } catch (e) {
            console.error('[useOmenXBalance] poll failed:', e);
        }
    };
    
    await poll();
    pollTimer = setInterval(poll, 5000);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

export function useOmenXBalance() {
    const [balance, setBalance] = useState(cachedBalance);
    const [loading, setLoading] = useState(cachedBalance === null);

    useEffect(() => {
        const listener = (val) => { setBalance(val); setLoading(false); };
        listeners.add(listener);

        startPolling();

        if (cachedBalance !== null) { setBalance(cachedBalance); setLoading(false); }

        return () => {
            listeners.delete(listener);
            if (listeners.size === 0) stopPolling();
        };
    }, []);

    return { balance, loading };
}