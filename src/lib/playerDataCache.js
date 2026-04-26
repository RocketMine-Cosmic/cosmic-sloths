import { base44 } from '@/api/base44Client';

// ─────────────────────────────────────────────────────────
// Unified OmenX data cache (balance + vipLevel + nfts).
// ONE backend endpoint (`getPlayerData`) — ONE OmenX call.
//
// • Initial fetch on first subscriber (debounced 5s).
// • Balance can be force-refreshed after purchases (2s debounced).
// • VIP + NFTs survive a full session via sessionStorage.
// • Balance survives 15 min via localStorage.
// ─────────────────────────────────────────────────────────

const BALANCE_CACHE_TTL = 15 * 60 * 1000;

function loadBalanceCache() {
    try {
        const raw = localStorage.getItem('omenx_balance_cache');
        if (!raw) return null;
        const { balance, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp < BALANCE_CACHE_TTL) return { balance, timestamp };
    } catch {}
    return null;
}

function saveBalanceCache(balance) {
    try { localStorage.setItem('omenx_balance_cache', JSON.stringify({ balance, timestamp: Date.now() })); } catch {}
}

function loadSessionCache() {
    try {
        const raw = sessionStorage.getItem('omenx_session_data');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {}
    return null;
}

function saveSessionCache(data) {
    try {
        sessionStorage.setItem('omenx_session_data', JSON.stringify(data));
        if (data.nfts) localStorage.setItem('omenx_nft_data', JSON.stringify(data.nfts));
    } catch {}
}

// ─────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────
const persistedBalance = loadBalanceCache();
const persistedSession = loadSessionCache();
let cachedData = null; // { balance, vipLevel, nfts, user }
const listeners = new Set();
let inFlightFetch = null;          // single in-flight network promise
let lastFetchAt = persistedBalance ? persistedBalance.timestamp : 0;
let scheduledFetchTimer = null;    // startup debounce
let userFetched = false;
let refreshTimer = null;           // debounce post-purchase refresh

// Seed from persisted caches immediately (no flicker)
if (persistedBalance || persistedSession) {
    cachedData = {
        balance: persistedBalance?.balance ?? 0,
        vipLevel: persistedSession?.vipLevel ?? 0,
        nfts: persistedSession?.nfts ?? [],
    };
}

function getAuthData() {
    try {
        const stored = localStorage.getItem('omenx_auth_data');
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return (parsed?.walletAddress && parsed?.accessToken) ? parsed : null;
    } catch { return null; }
}

function notify() { listeners.forEach(fn => fn(cachedData)); }

function applyData(patch) {
    cachedData = { ...(cachedData || { balance: 0, vipLevel: 0, nfts: [] }), ...patch };
    notify();
}

// ─────────────────────────────────────────────────────────
// THE single fetcher (balance + vip + nfts in one call)
// ─────────────────────────────────────────────────────────
async function fetchOmenXData(force = false) {
    if (inFlightFetch) return inFlightFetch;
    if (!force && Date.now() - lastFetchAt < BALANCE_CACHE_TTL) return;

    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) {
        applyData({ balance: 0, vipLevel: 0, nfts: [] });
        return;
    }

    inFlightFetch = (async () => {
        try {
            const res = await base44.functions.invoke('getPlayerData', {});
            const balance = res.data?.balance ?? 0;
            const vipLevel = res.data?.vipLevel ?? 0;
            const nfts = res.data?.nfts ?? [];
            lastFetchAt = Date.now();
            saveBalanceCache(balance);
            saveSessionCache({ vipLevel, nfts });
            applyData({ balance, vipLevel, nfts });
        } catch (e) {
            console.error('[playerDataCache] fetch failed:', e?.message);
            // Keep stale cache; don't zero it out on transient failure.
        } finally {
            inFlightFetch = null;
        }
    })();
    return inFlightFetch;
}

// User profile is local-only (read from omenx_auth_data) — no network.
function loadUserDataLocal() {
    if (userFetched) return;
    try {
        const stored = localStorage.getItem('omenx_auth_data');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        const user = {
            walletAddress: parsed.walletAddress,
            username: parsed.username || '',
            full_name: parsed.player_name || parsed.username || 'Player',
            player_name: parsed.player_name || parsed.username || 'Player',
            pilot_icon: parsed.pilot_icon || '🦥',
            data: {
                player_name: parsed.player_name || parsed.username || 'Player',
                player_title: parsed.player_title || '',
                pilot_icon: parsed.pilot_icon || '🦥',
            },
        };
        applyData({ user });
    } catch {}
    userFetched = true;
}

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

export function fetchPlayerData(force = false) {
    if (force) {
        if (scheduledFetchTimer) { clearTimeout(scheduledFetchTimer); scheduledFetchTimer = null; }
        lastFetchAt = 0;
        fetchOmenXData(true);
        return;
    }
    if (scheduledFetchTimer || inFlightFetch) return;
    // Delay 5s on first load to let the app settle, then fetch once.
    const jitter = 5000 + Math.floor(Math.random() * 5000);
    scheduledFetchTimer = setTimeout(() => {
        scheduledFetchTimer = null;
        fetchOmenXData();
    }, jitter);
}

let storageListenerAttached = false;

export function subscribePlayerData(fn) {
    listeners.add(fn);
    if (cachedData !== null) fn(cachedData);

    // First subscriber kicks off initial work.
    if (listeners.size === 1) {
        loadUserDataLocal();
        if (cachedData === null && !inFlightFetch && !scheduledFetchTimer) {
            fetchPlayerData();
        }
    }

    if (!storageListenerAttached) {
        storageListenerAttached = true;
        window.addEventListener('storage', (e) => {
            if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) {
                // New login — clear caches and re-fetch once.
                lastFetchAt = 0;
                userFetched = false;
                cachedData = null;
                try { localStorage.removeItem('omenx_balance_cache'); } catch {}
                try { sessionStorage.removeItem('omenx_session_data'); } catch {}
                if (scheduledFetchTimer) { clearTimeout(scheduledFetchTimer); scheduledFetchTimer = null; }
                loadUserDataLocal();
                fetchOmenXData(true);
            }
        });
    }

    return () => { listeners.delete(fn); };
}

// Force a refresh (used after purchases). Debounced to avoid 429s.
export function refreshBalance() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
        refreshTimer = null;
        fetchOmenXData(true);
    }, 2000);
}