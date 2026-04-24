import { base44 } from '@/api/base44Client';

// Shared singleton cache for balance + VIP
// Both useOmenXBalance and useOmenXVip read from here — ONE API call for both

// Persist cache to localStorage so page reloads don't immediately re-hit the API
function loadPersistedCache() {
    try {
        const raw = localStorage.getItem('omenx_player_data_cache');
        if (!raw) return null;
        const { data, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp < CACHE_DURATION) {
            lastFetchTime = timestamp;
            return data;
        }
    } catch {}
    return null;
}

function persistCache(data) {
    try {
        localStorage.setItem('omenx_player_data_cache', JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
}

const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes

let cachedData = loadPersistedCache();
let listeners = new Set();
let fetchInProgress = false;
let lastFetchTime = cachedData ? lastFetchTime : 0;
let startupTimer = null;
let scheduledFetch = false;

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
        persistCache(cachedData);
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
            cachedData = null;
            try { localStorage.removeItem('omenx_player_data_cache'); } catch {}
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