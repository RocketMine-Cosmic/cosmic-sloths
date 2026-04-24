import { base44 } from '@/api/base44Client';

// ─────────────────────────────────────────────────────────
// BALANCE cache — localStorage, 60 min TTL
// Refreshed in-game when needed (e.g. after purchases)
// ─────────────────────────────────────────────────────────
const BALANCE_CACHE_TTL = 60 * 60 * 1000; // 60 minutes

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
let cachedData = null; // { balance, vipLevel, nfts }
let listeners = new Set();
let balanceFetchInProgress = false;
let sessionFetchInProgress = false;
let lastBalanceFetch = persistedBalance ? persistedBalance.timestamp : 0;
let startupTimer = null;
let scheduledFetch = false;

function getAuthData() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
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

// ─────────────────────────────────────────────────────────
// Fetch balance (lightweight — 1 OmenX call)
// ─────────────────────────────────────────────────────────
async function fetchBalance(force = false) {
    const now = Date.now();
    if (!force && now - lastBalanceFetch < BALANCE_CACHE_TTL) return;
    if (balanceFetchInProgress) return;

    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) {
        applyBalance(0);
        return;
    }

    balanceFetchInProgress = true;
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
        balanceFetchInProgress = false;
    }
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
    if (sessionFetchInProgress) return;

    const auth = getAuthData();
    if (!auth?.walletAddress || !auth?.accessToken) return;

    sessionFetchInProgress = true;
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
        sessionFetchInProgress = false;
    }
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
    // Delay 2s on first load so SaveManager/loadSave gets priority
    startupTimer = setTimeout(() => {
        scheduledFetch = false;
        fetchBalance();
        fetchSessionData(); // once per session — no-op if already done
    }, 2000);
}

export function subscribePlayerData(fn) {
    listeners.add(fn);
    if (cachedData !== null) fn(cachedData);

    const onStorage = (e) => {
        if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) {
            // New login — clear everything and re-fetch
            lastBalanceFetch = 0;
            cachedData = null;
            try { localStorage.removeItem('omenx_balance_cache'); } catch {}
            try { sessionStorage.removeItem('omenx_session_data'); } catch {}
            if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
            fetchBalance();
            fetchSessionData();
        }
    };
    window.addEventListener('storage', onStorage);

    return () => {
        listeners.delete(fn);
        window.removeEventListener('storage', onStorage);
    };
}