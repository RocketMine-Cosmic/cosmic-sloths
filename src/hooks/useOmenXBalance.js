import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { subscribeWalletRealtimeWithOmenXAuth } from '@omen.foundation/game-sdk';

// Singleton cache — shared across all hook instances
let cachedBalance = null;
let listeners = new Set();
let subscription = null;
let consumerCount = 0;
let fetchInProgress = false;

function notify() {
    listeners.forEach(fn => fn(cachedBalance));
}

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

async function fetchBalance() {
    if (fetchInProgress) return;
    const auth = getAuthData();
    if (!auth?.walletAddress) {
        cachedBalance = null;
        notify();
        return;
    }
    fetchInProgress = true;
    try {
        const res = await base44.functions.invoke('getOmenXBalance', {
            walletAddress: auth.walletAddress,
        });
        cachedBalance = res.data?.balance ?? null;
        notify();
    } catch (e) {
        cachedBalance = null;
        notify();
    } finally {
        fetchInProgress = false;
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

        // Fetch on mount only if no cached balance yet (catches fresh page load after mobile OAuth)
        if (cachedBalance === null) fetchBalance().then(() => startSubscription());
        else startSubscription();

        // Sync with latest cache immediately
        if (cachedBalance !== null) { setBalance(cachedBalance); setLoading(false); }

        const onStorage = (e) => { if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) { stopSubscription(); fetchBalance().then(() => startSubscription()); } };
        window.addEventListener('storage', onStorage);

        // If redirected back after mobile OAuth, clean the URL
        const url = new URL(window.location.href);
        if (url.searchParams.get('omenx_login')) {
            url.searchParams.delete('omenx_login');
            window.history.replaceState({}, '', url.toString());
        }

        return () => {
            listeners.delete(listener);
            consumerCount--;
            window.removeEventListener('storage', onStorage);
            if (consumerCount <= 0) { consumerCount = 0; stopSubscription(); }
        };
    }, []);

    return { balance, loading, refresh: fetchBalance };
}