import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Singleton cache — shared across all hook instances
let cachedBalance = null;
let lastFetchTime = 0;
let isFetching = false;
let listeners = new Set();
const POLL_INTERVAL = 600_000; // 10 minutes
const MIN_REFETCH = 5_000;    // don't re-fetch within 5s

function notify() {
    listeners.forEach(fn => fn(cachedBalance));
}

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

async function fetchBalanceOnce() {
    if (isFetching) return;
    const auth = getAuthData();
    if (!auth?.walletAddress) {
        cachedBalance = null;
        notify();
        return;
    }
    const now = Date.now();
    if (now - lastFetchTime < MIN_REFETCH) return;
    isFetching = true;
    try {
        const res = await base44.functions.invoke('getOmenXBalance', {
            walletAddress: auth.walletAddress,
        });
        cachedBalance = res.data?.balance ?? null;
        lastFetchTime = Date.now();
        notify();
    } catch (e) {
        console.error('[useOmenXBalance] failed:', e);
        cachedBalance = null;
        notify();
    } finally {
        isFetching = false;
    }
}

// Single global poll — starts when first consumer mounts, stops when last unmounts
let pollTimer = null;
let consumerCount = 0;

function startPolling() {
    if (pollTimer) return;
    fetchBalanceOnce();
    pollTimer = setInterval(fetchBalanceOnce, POLL_INTERVAL);
}

function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

export function useOmenXBalance() {
    const [balance, setBalance] = useState(cachedBalance);
    const [loading, setLoading] = useState(cachedBalance === null);

    useEffect(() => {
        const listener = (val) => { setBalance(val); setLoading(false); };
        listeners.add(listener);
        consumerCount++;

        startPolling();

        // Sync with latest cache immediately
        if (cachedBalance !== null) { setBalance(cachedBalance); setLoading(false); }

        const onStorage = (e) => { if (e.key === 'omenx_auth_data') { lastFetchTime = 0; fetchBalanceOnce(); } };
        const onFocus = () => { lastFetchTime = 0; fetchBalanceOnce(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener('focus', onFocus);

        return () => {
            listeners.delete(listener);
            consumerCount--;
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('focus', onFocus);
            if (consumerCount <= 0) { consumerCount = 0; stopPolling(); }
        };
    }, []);

    return { balance, loading, refresh: () => { lastFetchTime = 0; fetchBalanceOnce(); } };
}