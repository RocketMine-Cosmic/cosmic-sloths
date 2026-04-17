import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { subscribeWalletRealtimeWithOmenXAuth } from '@omen.foundation/game-sdk';

// Singleton cache — shared across all hook instances
let cachedBalance = null;
let listeners = new Set();
let subscription = null;
let consumerCount = 0;

function notify() {
    listeners.forEach(fn => fn(cachedBalance));
}

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

async function fetchBalance() {
    const auth = getAuthData();
    if (!auth?.walletAddress) {
        cachedBalance = null;
        notify();
        return;
    }
    try {
        const res = await base44.functions.invoke('getOmenXBalance', {
            walletAddress: auth.walletAddress,
        });
        cachedBalance = res.data?.balance ?? null;
        notify();
    } catch (e) {
        console.error('[useOmenXBalance] fetch failed:', e);
        cachedBalance = null;
        notify();
    }
}

function startSubscription() {
    if (subscription) return;
    const auth = getAuthData();
    if (!auth?.accessToken || !auth?.walletAddress) {
        fetchBalance();
        return;
    }
    try {
        subscription = subscribeWalletRealtimeWithOmenXAuth({
            apiBaseUrl: 'https://api.omen.foundation',
            getAccessToken: () => Promise.resolve(getAuthData()?.accessToken ?? null),
            walletAddress: auth.walletAddress,
            onBalance: fetchBalance,
        });
    } catch (e) {
        console.error('[useOmenXBalance] subscription failed:', e);
        fetchBalance();
    }
}

function stopSubscription() {
    if (subscription) { subscription(); subscription = null; }
}

export function useOmenXBalance() {
    const [balance, setBalance] = useState(cachedBalance);
    const [loading, setLoading] = useState(cachedBalance === null);

    useEffect(() => {
        const listener = (val) => { setBalance(val); setLoading(false); };
        listeners.add(listener);
        consumerCount++;

        startSubscription();

        // Sync with latest cache immediately
        if (cachedBalance !== null) { setBalance(cachedBalance); setLoading(false); }

        const onStorage = (e) => { if (e.key === 'omenx_auth_data') { stopSubscription(); startSubscription(); } };
        window.addEventListener('storage', onStorage);

        return () => {
            listeners.delete(listener);
            consumerCount--;
            window.removeEventListener('storage', onStorage);
            if (consumerCount <= 0) { consumerCount = 0; stopSubscription(); }
        };
    }, []);

    return { balance, loading, refresh: fetchBalance };
}