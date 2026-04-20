import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { subscribeWalletRealtimeWithOmenXAuth } from '@omen.foundation/game-sdk';

// Singleton cache — shared across all hook instances
let cachedBalance = null;
let listeners = new Set();
let consumerCount = 0;
let fetchInProgress = false;
let lastFetchTime = 0;
let pollingInitialized = false;
const BALANCE_CACHE_DURATION = 120000; // 2 minutes — poll interval

function notify() {
    listeners.forEach(fn => fn(cachedBalance));
}

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

async function fetchBalance(force = false) {
    const now = Date.now();
    // Skip if cache is fresh and not forced
    if (!force && now - lastFetchTime < BALANCE_CACHE_DURATION) return;
    if (fetchInProgress) return;
    
    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) {
        cachedBalance = null;
        notify();
        return;
    }
    
    fetchInProgress = true;
    try {
        const res = await base44.functions.invoke('getOmenXBalance', {
            walletAddress: auth.walletAddress,
            accessToken: auth.accessToken,
        });
        cachedBalance = res.data?.balance ?? null;
        lastFetchTime = now;
        notify();
    } catch (e) {
        // Silent error handling - balance fetch failed
        cachedBalance = null;
        notify();
    } finally {
        fetchInProgress = false;
    }
}

let pollInterval = null;

function startPolling() {
    if (pollingInitialized) return;
    pollingInitialized = true;
    const now = Date.now();
    // Only fetch if cache is stale
    if (now - lastFetchTime >= BALANCE_CACHE_DURATION) {
        fetchBalance();
    }
    pollInterval = setInterval(() => fetchBalance(), BALANCE_CACHE_DURATION);
}

function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    pollingInitialized = false;
}

export function useOmenXBalance() {
    const [balance, setBalance] = useState(cachedBalance);
    const [loading, setLoading] = useState(cachedBalance === null);

    useEffect(() => {
        const listener = (val) => { setBalance(val); setLoading(false); };
        listeners.add(listener);
        consumerCount++;

        // Start polling once globally
        startPolling();

        // Sync with latest cache immediately
        if (cachedBalance !== null) { setBalance(cachedBalance); setLoading(false); }

        const onStorage = (e) => { if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) { stopPolling(); fetchBalance().then(() => startPolling()); } };
        window.addEventListener('storage', onStorage);

        const onVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                startPolling();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            listeners.delete(listener);
            consumerCount--;
            window.removeEventListener('storage', onStorage);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (consumerCount <= 0) { consumerCount = 0; stopPolling(); }
        };
    }, []);

    return { balance, loading, refresh: () => fetchBalance(true) };
}