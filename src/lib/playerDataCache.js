import { base44 } from '@/api/base44Client';

// ─────────────────────────────────────────────────────────
// Player data cache:
//   • BALANCE  — live OMENX balance, refreshed regularly (15min TTL,
//                 force-refreshable after purchases via refreshBalance()).
//   • STATIC   — VIP level + NFTs. These rarely change, so we cache for
//                 24h and only refetch on explicit user action via
//                 refreshStaticPlayerData() (tied to the Profile refresh
//                 button). VIP level never decreases.
// ─────────────────────────────────────────────────────────

const BALANCE_TTL = 15 * 60 * 1000;          // 15 min
const STATIC_TTL  = 24 * 60 * 60 * 1000;     // 24 h

// ── Persistence helpers ──────────────────────────────────
function loadJSON(key, store = localStorage) {
    try { return JSON.parse(store.getItem(key)); } catch { return null; }
}
function saveJSON(key, value, store = localStorage) {
    try { store.setItem(key, JSON.stringify(value)); } catch {}
}

const persistedBalance = loadJSON('omenx_balance_cache');
const persistedStatic  = loadJSON('omenx_static_cache');

// ── State ────────────────────────────────────────────────
let cachedData = null; // { balance, vipLevel, nfts, user }
const listeners = new Set();
let inFlightBalance = null;
let inFlightStatic = null;
let lastBalanceFetchAt = persistedBalance?.timestamp || 0;
let lastStaticFetchAt = persistedStatic?.timestamp || 0;
let scheduledBalanceTimer = null;
let refreshBalanceTimer = null;
let userFetched = false;

// Seed from persisted caches immediately (no flicker)
if (persistedBalance || persistedStatic) {
    cachedData = {
        balance: persistedBalance?.balance ?? 0,
        vipLevel: persistedStatic?.vipLevel ?? 0,
        nfts: persistedStatic?.nfts ?? [],
    };
    // Mirror NFTs to legacy localStorage key consumed by NFTPerks at game-start.
    if (persistedStatic?.nfts) saveJSON('omenx_nft_data', persistedStatic.nfts);
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

// ── Balance fetch (frequent) ─────────────────────────────
async function fetchBalance(force = false) {
    if (inFlightBalance) return inFlightBalance;
    if (!force && Date.now() - lastBalanceFetchAt < BALANCE_TTL) return;

    const auth = getAuthData();
    if (!auth?.walletAddress) { applyData({ balance: 0 }); return; }

    inFlightBalance = (async () => {
        try {
            const res = await base44.functions.invoke('getPlayerBalance', {});
            const balance = res.data?.balance ?? 0;
            lastBalanceFetchAt = Date.now();
            saveJSON('omenx_balance_cache', { balance, timestamp: lastBalanceFetchAt });
            applyData({ balance });
        } catch (e) {
            console.error('[playerDataCache] balance fetch failed:', e?.message);
        } finally {
            inFlightBalance = null;
        }
    })();
    return inFlightBalance;
}

// ── Static (VIP + NFT) fetch — manual / 24h cooldown ─────
async function fetchStatic(force = false) {
    if (inFlightStatic) return inFlightStatic;
    if (!force && Date.now() - lastStaticFetchAt < STATIC_TTL) return;

    const auth = getAuthData();
    if (!auth?.walletAddress) { applyData({ vipLevel: 0, nfts: [] }); return; }

    inFlightStatic = (async () => {
        try {
            const res = await base44.functions.invoke('getStaticPlayerData', {});
            const vipLevel = res.data?.vipLevel ?? 0;
            const nfts = res.data?.nfts ?? [];
            lastStaticFetchAt = Date.now();
            saveJSON('omenx_static_cache', { vipLevel, nfts, timestamp: lastStaticFetchAt });
            saveJSON('omenx_nft_data', nfts);
            applyData({ vipLevel, nfts });
        } catch (e) {
            console.error('[playerDataCache] static fetch failed:', e?.message);
        } finally {
            inFlightStatic = null;
        }
    })();
    return inFlightStatic;
}

// User profile — local-only (read from omenx_auth_data) — no network.
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
    // Initial / general-purpose load:
    //  • balance refreshes per its TTL
    //  • static (VIP + NFTs) only fetches if cache is missing / stale (24h)
    if (force) {
        if (scheduledBalanceTimer) { clearTimeout(scheduledBalanceTimer); scheduledBalanceTimer = null; }
        lastBalanceFetchAt = 0;
        fetchBalance(true);
        return;
    }
    if (!scheduledBalanceTimer && !inFlightBalance) {
        const jitter = 5000 + Math.floor(Math.random() * 5000);
        scheduledBalanceTimer = setTimeout(() => {
            scheduledBalanceTimer = null;
            fetchBalance();
        }, jitter);
    }
    fetchStatic(); // respects 24h TTL
}

let storageListenerAttached = false;

export function subscribePlayerData(fn) {
    listeners.add(fn);
    if (cachedData !== null) fn(cachedData);

    if (listeners.size === 1) {
        loadUserDataLocal();
        if (cachedData === null && !inFlightBalance && !scheduledBalanceTimer) {
            fetchPlayerData();
        }
    }

    if (!storageListenerAttached) {
        storageListenerAttached = true;
        window.addEventListener('storage', (e) => {
            if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) {
                // New login — clear caches and re-fetch.
                lastBalanceFetchAt = 0;
                lastStaticFetchAt = 0;
                userFetched = false;
                cachedData = null;
                try {
                    localStorage.removeItem('omenx_balance_cache');
                    localStorage.removeItem('omenx_static_cache');
                } catch {}
                if (scheduledBalanceTimer) { clearTimeout(scheduledBalanceTimer); scheduledBalanceTimer = null; }
                loadUserDataLocal();
                fetchBalance(true);
                fetchStatic(true);
            }
        });
    }

    return () => { listeners.delete(fn); };
}

// Force a balance refresh (used after purchases). Debounced 2s.
export function refreshBalance() {
    if (refreshBalanceTimer) return;
    refreshBalanceTimer = setTimeout(() => {
        refreshBalanceTimer = null;
        fetchBalance(true);
    }, 2000);
}

// Manual refresh of VIP + NFTs (Profile page button).
// Returns the next available refresh timestamp (Date.now() + 24h) on success,
// or the existing cooldown end time if still on cooldown.
export async function refreshStaticPlayerData() {
    const cooldownEnd = lastStaticFetchAt + STATIC_TTL;
    if (Date.now() < cooldownEnd) return { ok: false, cooldownEnd };
    await fetchStatic(true);
    return { ok: true, cooldownEnd: lastStaticFetchAt + STATIC_TTL };
}

// Read-only accessor for cooldown (used by the Profile UI to show timer).
export function getStaticRefreshCooldownEnd() {
    return lastStaticFetchAt + STATIC_TTL;
}