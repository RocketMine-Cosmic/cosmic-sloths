import { base44 } from '@/api/base44Client';

// ─────────────────────────────────────────────────────────
// Player data cache. Three independent data streams:
//   • BALANCE — live OMENX balance, 15min auto-refresh + post-purchase forced refresh.
//   • VIP     — VIP level. Rarely changes & never decreases.
//                Manual refresh only via Profile button (24h cooldown).
//   • NFTs    — NFT inventory. Manual refresh only via NFT Dashboard
//                button (24h cooldown).
// VIP and NFT have SEPARATE cooldowns so users can refresh either independently.
// ─────────────────────────────────────────────────────────

const BALANCE_TTL = 15 * 60 * 1000;          // 15 min
const VIP_COOLDOWN = 24 * 60 * 60 * 1000;    // 24 h
const NFT_COOLDOWN = 24 * 60 * 60 * 1000;    // 24 h

// ── Persistence helpers ──────────────────────────────────
function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const persistedBalance = loadJSON('omenx_balance_cache');
const persistedVip     = loadJSON('omenx_vip_cache');
const persistedNfts    = loadJSON('omenx_nft_cache');

// ── State ────────────────────────────────────────────────
let cachedData = null; // { balance, vipLevel, nfts, user }
const listeners = new Set();
let inFlightBalance = null;
let inFlightVip = null;
let inFlightNfts = null;
let lastBalanceFetchAt = persistedBalance?.timestamp || 0;
let lastVipFetchAt     = persistedVip?.timestamp || 0;
let lastNftFetchAt     = persistedNfts?.timestamp || 0;
let scheduledBalanceTimer = null;
let refreshBalanceTimer = null;
let userFetched = false;

// Seed from persisted caches immediately (no flicker)
if (persistedBalance || persistedVip || persistedNfts) {
    cachedData = {
        balance: persistedBalance?.balance ?? 0,
        vipLevel: persistedVip?.vipLevel ?? 0,
        nfts: persistedNfts?.nfts ?? [],
    };
    // Mirror NFTs to legacy localStorage key consumed by NFTPerks at game-start.
    if (persistedNfts?.nfts) saveJSON('omenx_nft_data', persistedNfts.nfts);
}

function getAuthData() {
    // Only walletAddress is required — backend functions authenticate via the
    // Base44 session and read the wallet from the linked User record. accessToken
    // is no longer needed (and won't exist for users who came in via Base44 login
    // without going through the OmenX OAuth flow).
    try {
        const stored = localStorage.getItem('omenx_auth_data');
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed?.walletAddress ? parsed : null;
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

// ── VIP fetch (manual, 24h cooldown) ─────────────────────
async function fetchVip() {
    if (inFlightVip) return inFlightVip;
    const auth = getAuthData();
    if (!auth?.walletAddress) return;

    inFlightVip = (async () => {
        try {
            const res = await base44.functions.invoke('getVipLevel', {});
            const vipLevel = res.data?.vipLevel ?? 0;
            lastVipFetchAt = Date.now();
            saveJSON('omenx_vip_cache', { vipLevel, timestamp: lastVipFetchAt });
            applyData({ vipLevel });
        } catch (e) {
            console.error('[playerDataCache] vip fetch failed:', e?.message);
        } finally {
            inFlightVip = null;
        }
    })();
    return inFlightVip;
}

// ── NFT fetch (manual, 24h cooldown) ─────────────────────
async function fetchNfts() {
    if (inFlightNfts) return inFlightNfts;
    const auth = getAuthData();
    if (!auth?.walletAddress) return;

    inFlightNfts = (async () => {
        try {
            const res = await base44.functions.invoke('getNFTs', {});
            const nfts = res.data?.nfts ?? [];
            lastNftFetchAt = Date.now();
            saveJSON('omenx_nft_cache', { nfts, timestamp: lastNftFetchAt });
            saveJSON('omenx_nft_data', nfts);
            applyData({ nfts });
        } catch (e) {
            console.error('[playerDataCache] nft fetch failed:', e?.message);
        } finally {
            inFlightNfts = null;
        }
    })();
    return inFlightNfts;
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
    // Initial / general-purpose load: balance only.
    // VIP and NFTs are deferred — they only fetch when the user opens
    // Profile / NFT Dashboard (via ensureVipFetched / ensureNftsFetched)
    // or when the user hits the manual refresh button.
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
}

// Lazy fetchers — call on demand from pages that actually need this data.
// No-ops if a cached value already exists (manual refresh buttons handle re-fetch).
export function ensureVipFetched() {
    if (lastVipFetchAt === 0) fetchVip();
}
export function ensureNftsFetched() {
    if (lastNftFetchAt === 0) fetchNfts();
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
                // New login — clear ALL caches and re-fetch.
                lastBalanceFetchAt = 0;
                lastVipFetchAt = 0;
                lastNftFetchAt = 0;
                userFetched = false;
                cachedData = null;
                try {
                    localStorage.removeItem('omenx_balance_cache');
                    localStorage.removeItem('omenx_vip_cache');
                    localStorage.removeItem('omenx_nft_cache');
                } catch {}
                if (scheduledBalanceTimer) { clearTimeout(scheduledBalanceTimer); scheduledBalanceTimer = null; }
                loadUserDataLocal();
                fetchBalance(true);
                // Don't auto-fetch VIP/NFTs on login — wait for Profile/NFT Dashboard mount
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

// Manual VIP refresh — Profile page button. Returns next cooldown end.
export async function refreshVipLevel() {
    const cooldownEnd = lastVipFetchAt + VIP_COOLDOWN;
    if (Date.now() < cooldownEnd) return { ok: false, cooldownEnd };
    await fetchVip();
    return { ok: true, cooldownEnd: lastVipFetchAt + VIP_COOLDOWN };
}
export function getVipCooldownEnd() { return lastVipFetchAt + VIP_COOLDOWN; }

// Manual NFT refresh — NFT Dashboard button. Returns next cooldown end.
export async function refreshNFTs() {
    const cooldownEnd = lastNftFetchAt + NFT_COOLDOWN;
    if (Date.now() < cooldownEnd) return { ok: false, cooldownEnd };
    await fetchNfts();
    return { ok: true, cooldownEnd: lastNftFetchAt + NFT_COOLDOWN };
}
export function getNFTCooldownEnd() { return lastNftFetchAt + NFT_COOLDOWN; }