import { base44 } from '@/api/base44Client';

// Shared singleton cache for balance + VIP
// Both useOmenXBalance and useOmenXVip read from here — ONE API call for both

let cachedData = null;
let listeners = new Set();
let fetchInProgress = false;
let lastFetchTime = 0;
let startupTimer = null;
let scheduledFetch = false;

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

function notify() {
    listeners.forEach(fn => fn(cachedData));
}

async function doFetch() {
    const now = Date.now();
    if (now - lastFetchTime < CACHE_DURATION) return;
    if (fetchInProgress) return;

    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) {
        cachedData = null;
        notify();
        return;
    }

    fetchInProgress = true;
    try {
        const res = await base44.functions.invoke('getPlayerData', {
            walletAddress: auth.walletAddress,
            accessToken: auth.accessToken,
        });
        cachedData = res.data || { balance: 0, vipLevel: 0 };
        lastFetchTime = Date.now();
        notify();
    } catch {
        cachedData = { balance: 0, vipLevel: 0 };
        notify();
    } finally {
        fetchInProgress = false;
    }
}

export function fetchPlayerData(force = false) {
    if (force) {
        lastFetchTime = 0;
        scheduledFetch = false;
        if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
        doFetch();
        return;
    }
    if (scheduledFetch) return;
    scheduledFetch = true;
    // Delay 2s on first load so SaveManager/loadSave gets priority
    startupTimer = setTimeout(() => {
        scheduledFetch = false;
        doFetch();
    }, 2000);
}

export function subscribePlayerData(fn) {
    listeners.add(fn);
    if (cachedData !== null) fn(cachedData);

    const onStorage = (e) => {
        if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) {
            lastFetchTime = 0;
            scheduledFetch = false;
            if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
            doFetch();
        }
    };
    window.addEventListener('storage', onStorage);

    return () => {
        listeners.delete(fn);
        window.removeEventListener('storage', onStorage);
    };
}