import { base44 } from '@/api/base44Client';

// ─────────────────────────────────────────────────────────
// BALANCE cache — localStorage, 10 min TTL
// Refreshed in-game when needed (e.g. after purchases)
// ─────────────────────────────────────────────────────────
const BALANCE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
    try {
        localStorage.setItem('omenx_balance_cache', JSON.stringify({ balance, timestamp: Date.now() }));
    } catch {}
}

// ─────────────────────────────────────────────────────────
// NFT + VIP cache — sessionStorage, once per browser session
// ─────────────────────────────────────────────────────────
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
        // Also persist NFT data to localStorage for GameEngine access
        if (data.nfts) localStorage.setItem('omenx_nft_data', JSON.stringify(data.nfts));
    } catch {}
}

// ─────────────────────────────────────────────────────────
// Shared state
// ─────────────────────────────────────────────────────────
const persistedBalance = loadBalanceCache();
let cachedData = null; // { balance, vipLevel, nfts, user }
let listeners = new Set();
let balanceFetchPromise = null;
let sessionFetchPromise = null;
let userFetchPromise = null;
let lastBalanceFetch = persistedBalance ? persistedBalance.timestamp : 0;
let startupTimer = null;
let scheduledFetch = false;
let isFetchingBalance = false; // Guard concurrent fetches
let userFetched = false; // Track if user data has been fetched this session

function getAuthData() {
    try {
        const stored = localStorage.getItem('omenx_auth_data');
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        // Validate required fields before returning
        return (parsed?.walletAddress && parsed?.accessToken) ? parsed : null;
    } catch { return null; }
}

function notify() {
    listeners.forEach(fn => fn(cachedData));
}

// Merge balance into cachedData
function applyBalance(balance) {
    cachedData = { ...(cachedData || { vipLevel: 0, nfts: [] }), balance };
    notify();
}

// Merge session data (vip + nfts) into cachedData
function applySessionData(sessionData) {
    cachedData = { ...(cachedData || { balance: 0 }), ...sessionData };
    notify();
}

// Merge user data into cachedData
function applyUserData(user) {
    cachedData = { ...(cachedData || { vipLevel: 0, nfts: [], balance: 0 }), user };
    notify();
}

// ─────────────────────────────────────────────────────────
// Fetch balance (lightweight — 1 OmenX call)
// ─────────────────────────────────────────────────────────
async function fetchBalance(force = false) {
    const now = Date.now();
    // Return existing in-flight promise to prevent duplicate calls
    if (balanceFetchPromise || isFetchingBalance) return balanceFetchPromise;
    // Skip if cache is fresh
    if (!force && now - lastBalanceFetch < BALANCE_CACHE_TTL) return;

    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) {
        applyBalance(0);
        return;
    }

    isFetchingBalance = true;
    balanceFetchPromise = (async () => {
        try {
            const res = await base44.functions.invoke('getPlayerBalance', {
                walletAddress: auth.walletAddress,
                accessToken: auth.accessToken,
            });
            const balance = res.data?.balance ?? 0;
            lastBalanceFetch = Date.now();
            saveBalanceCache(balance);
            applyBalance(balance);
        } catch {
            applyBalance(persistedBalance?.balance ?? 0);
        } finally {
            balanceFetchPromise = null;
            isFetchingBalance = false;
        }
    })();
    return balanceFetchPromise;
}

// ─────────────────────────────────────────────────────────
// Fetch NFT + VIP (heavy — once per session only)
// ─────────────────────────────────────────────────────────
async function fetchSessionData() {
    // Already loaded this session — skip entirely
    const existing = loadSessionCache();
    if (existing) {
        applySessionData(existing);
        return;
    }
    // Return existing in-flight promise to prevent duplicate calls
    if (sessionFetchPromise) return sessionFetchPromise;

    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) return;

    sessionFetchPromise = (async () => {
        try {
            const res = await base44.functions.invoke('getPlayerData', {
                walletAddress: auth.walletAddress,
                accessToken: auth.accessToken,
            });
            const sessionData = { vipLevel: res.data?.vipLevel ?? 0, nfts: res.data?.nfts ?? [] };
            saveSessionCache(sessionData);
            applySessionData(sessionData);
        } catch {
            applySessionData({ vipLevel: 0, nfts: [] });
        } finally {
            sessionFetchPromise = null;
        }
    })();
    return sessionFetchPromise;
}

// ─────────────────────────────────────────────────────────
// Fetch user profile (once per session only)
// ─────────────────────────────────────────────────────────
async function fetchUserData() {
    // Already fetched this session — skip
    if (userFetched) return;
    // Return existing in-flight promise to prevent duplicate calls
    if (userFetchPromise) return userFetchPromise;

    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) return;

    userFetchPromise = (async () => {
        try {
            const stored = localStorage.getItem('omenx_auth_data');
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
                }
            };
            applyUserData(user);
            userFetched = true;
        } catch {
            userFetched = true;
        } finally {
            userFetchPromise = null;
        }
    })();
    return userFetchPromise;
}

// ─────────────────────────────────────────────────────────
// Seed from persisted balance immediately (no flicker)
// ─────────────────────────────────────────────────────────
if (persistedBalance) {
    cachedData = { balance: persistedBalance.balance, vipLevel: 0, nfts: [] };
}
const existingSession = loadSessionCache();
if (existingSession) {
    cachedData = { ...(cachedData || { balance: 0 }), ...existingSession };
}

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

export function fetchPlayerData(force = false) {
    if (force) {
        lastBalanceFetch = 0;
        if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
        fetchBalance(true);
        return;
    }
    if (scheduledFetch) return;
    scheduledFetch = true;
    // Delay 5s on first load to let the app settle, then fetch once
    const jitter = 5000 + Math.floor(Math.random() * 5000);
    startupTimer = setTimeout(() => {
        scheduledFetch = false;
        fetchBalance();
        fetchSessionData(); // once per session — no-op if already done
    }, jitter);
}

export function subscribePlayerData(fn) {
    listeners.add(fn);
    if (cachedData !== null) fn(cachedData);

    // Only trigger fetch once (first subscriber initializes)
    if (listeners.size === 1) {
        if (cachedData === null && !balanceFetchPromise && !scheduledFetch && !startupTimer) {
            fetchPlayerData();
        }
        if (!userFetched) {
            fetchUserData();
        }
    }

    const onStorage = (e) => {
        if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) {
            // New login — clear everything and re-fetch
            lastBalanceFetch = 0;
            userFetched = false;
            cachedData = null;
            try { localStorage.removeItem('omenx_balance_cache'); } catch {}
            try { sessionStorage.removeItem('omenx_session_data'); } catch {}
            if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
            fetchBalance();
            fetchSessionData();
            fetchUserData();
        }
    };
    window.addEventListener('storage', onStorage);

    return () => {
        listeners.delete(fn);
        window.removeEventListener('storage', onStorage);
    };
}

// Force immediate balance refresh (used after purchases)
export function refreshBalance() {
    lastBalanceFetch = 0;
    return fetchBalance(true);
}