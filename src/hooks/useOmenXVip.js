import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Singleton cache
let cachedVip = null;
let listeners = new Set();
let fetchInProgress = false;
let lastFetchTime = 0;
const VIP_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function notify() {
    listeners.forEach(fn => fn(cachedVip));
}

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

async function fetchVip(force = false) {
    const now = Date.now();
    if (!force && now - lastFetchTime < VIP_CACHE_DURATION) return;
    if (fetchInProgress) return;
    
    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) {
        cachedVip = null;
        notify();
        return;
    }
    
    fetchInProgress = true;
    try {
        const res = await base44.functions.invoke('getVipLevel', {
            walletAddress: auth.walletAddress,
            accessToken: auth.accessToken,
        });
        cachedVip = res.data?.vipLevel || 0;
        lastFetchTime = now;
        notify();
    } catch (e) {
        cachedVip = null;
        notify();
    } finally {
        fetchInProgress = false;
    }
}

let pollInitialized = false;

function startPolling() {
    if (pollInitialized) return;
    pollInitialized = true;
    const now = Date.now();
    if (now - lastFetchTime >= VIP_CACHE_DURATION) {
        fetchVip();
    }
}

function stopPolling() {
    pollInitialized = false;
}

export function useOmenXVip() {
    const [vip, setVip] = useState(cachedVip);
    const [loading, setLoading] = useState(cachedVip === null);

    useEffect(() => {
        const listener = (val) => { setVip(val); setLoading(false); };
        listeners.add(listener);

        startPolling();

        if (cachedVip !== null) { setVip(cachedVip); setLoading(false); }

        const onStorage = (e) => { if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) { stopPolling(); pollInitialized = false; fetchVip().then(() => startPolling()); } };
        window.addEventListener('storage', onStorage);

        return () => {
            listeners.delete(listener);
            window.removeEventListener('storage', onStorage);
            if (listeners.size === 0) { stopPolling(); }
        };
    }, []);

    return { vip, loading };
}