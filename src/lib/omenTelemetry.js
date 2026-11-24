// Omen session telemetry (T-006, 24 Nov 2026). Omen's portal → Activity tab shows each player as
// active / idle / stale / ended. Guide: Omen developer MCP `activity-telemetry-guide` (= the npm
// package's docs/ACTIVITY_TELEMETRY.md, SDK 2.4.0).
//
// Two paths, one call for the rest of the game: reportOmenActivity(name, props).
//
//   Inside the Omen Arcade frame — the 2.4.0 SDK (src/lib/omenx.js) already holds the Arcade's
//   game-scoped pass and its renewals; omenx.js calls startSession() after init(). Events go to
//   omenx.reportActivity.
//
//   cosmic-sloths.com in its own tab — Omen's standalone OmenXActivityClient, reading our own saved
//   sign-in (omenx_auth_data). That pass lasts 1 hour and the daily silent refresh runs once a day,
//   so when the pass is (nearly) out and the player DOES something, we swap the saved refresh token
//   for a new pass on our server (refreshOmenXToken, our API key). The new pass is kept in memory
//   for telemetry only; the game's saved sign-in is not changed (only a rotated refresh token is
//   kept). No screens, no redirects. If Omen gave no refresh token, or refuses it, telemetry simply
//   pauses until the next fresh sign-in (the agreed fallback).
//
//   Base44 builder preview — nothing.
//
// Omen's rule: report REAL player actions only — never from a timer, the game loop, polling or
// auth callbacks. Stable snake_case names, the varying part in properties, no wallets / tokens /
// personal data. Liveness is the SDK's own heartbeat. reportActivity never throws.

import { OmenXActivityClient } from '@omen.foundation/game-sdk';
import { omenx } from '@/lib/omenx';
import { isFramed, isEmbeddedForPlayers } from '@/lib/frameContext';
import { OMEN_AUTH_KEY, readOmenAuth, updateOmenRefreshToken } from '@/lib/omenAuthStore';
import { base44 } from '@/api/base44Client';

const GAME_ID = 'cosmic-sloths';
const API_BASE = 'https://api.omen.foundation';
// Refresh when the pass has less than this left (the server ends a session 5 min after expiry).
const REFRESH_AHEAD_MS = 5 * 60 * 1000;
// After a failed refresh that might be temporary, wait before trying again.
const RETRY_AFTER_MS = 10 * 60 * 1000;
// The event that the player-action bridge in base44Client.js dispatches.
export const PLAYER_ACTION_EVENT = 'cs-player-action';

const mode = () => {
    if (typeof window === 'undefined') return 'off';
    if (isEmbeddedForPlayers()) return 'arcade';
    if (isFramed()) return 'off'; // Base44 builder preview
    return 'website';
};

// Only these are worth a line in the console; everything else is routine (guide §7).
const LOGGED = new Set(['session_started', 'session_ended', 'session_disabled', 'unauthorized', 'telemetry_paused', 'session_lost']);
export const logTelemetryDiagnostic = (d) => {
    try {
        if (!d || !LOGGED.has(d.code)) return;
        const line = `[OmenX telemetry] ${d.code}${d.errorCode ? ' ' + d.errorCode : ''}${d.status ? ' (' + d.status + ')' : ''}`;
        if (d.code === 'unauthorized' || d.code === 'telemetry_paused') console.warn(line, d.requestId || '');
        else console.info(line);
    } catch {}
};

// ---- website: auth for the standalone client ------------------------------------------------

// Reads the claims of a pass (JWT payload) without checking it — Omen checks it. Pass claims per
// Omen's docs: walletAddress, userId, aud, iss, exp.
function claimsOf(token) {
    try {
        const part = String(token).split('.')[1];
        if (!part) return null;
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(b64 + '==='.slice((b64.length + 3) % 4)));
    } catch {
        return null;
    }
}

function authFromToken(accessToken, saved, expiresInSec) {
    const c = claimsOf(accessToken) || {};
    const walletAddress = c.walletAddress || saved?.walletAddress;
    const userId = c.userId || c.sub || saved?.userId || walletAddress;
    let expiresAt = typeof c.exp === 'number' ? c.exp * 1000 : undefined;
    if (!expiresAt && expiresInSec) expiresAt = Date.now() + Number(expiresInSec) * 1000;
    return { accessToken, userId: String(userId || ''), gameId: GAME_ID, walletAddress, expiresAt };
}

// A pass from our own refresh, in memory only. Dropped when the saved sign-in changes wallet.
let refreshed = null;
// A refresh token Omen refused; not tried again until a different one is saved.
let deadRefreshToken = null;
let refreshFailedAt = 0;
let refreshing = null;

const sameWallet = (a, b) => !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();

function currentAuth() {
    const saved = readOmenAuth();
    if (!saved?.accessToken || !saved?.walletAddress) return null;
    const fromSaved = authFromToken(saved.accessToken, saved);
    if (refreshed && sameWallet(refreshed.walletAddress, saved.walletAddress)) {
        // The later-expiring of the two (the morning's fresh sign-in can be newer than our refresh).
        if (!fromSaved.expiresAt || (refreshed.expiresAt || 0) > fromSaved.expiresAt) return refreshed;
    }
    return fromSaved;
}

const needsRefresh = (auth) =>
    !!auth && !!auth.expiresAt && auth.expiresAt - Date.now() < REFRESH_AHEAD_MS;

// Swaps the saved refresh token for a new pass. Single flight; at most one try per 10 min after a
// failure; never for a token Omen already refused. Resolves true when a new pass is in place.
function refreshPass() {
    if (refreshing) return refreshing;
    const saved = readOmenAuth();
    const rt = saved?.refreshToken;
    if (!rt || rt === deadRefreshToken) return Promise.resolve(false);
    if (Date.now() - refreshFailedAt < RETRY_AFTER_MS) return Promise.resolve(false);

    refreshing = (async () => {
        try {
            const res = await base44.functions.invoke('refreshOmenXToken', { refreshToken: rt });
            const d = res?.data || {};
            if (!d.accessToken) {
                if (d.dead) deadRefreshToken = rt;
                else refreshFailedAt = Date.now();
                console.warn('[OmenX telemetry] pass refresh not done:', d.error || 'no token');
                return false;
            }
            const auth = authFromToken(d.accessToken, saved, d.expiresIn);
            if (!sameWallet(auth.walletAddress, saved.walletAddress)) {
                deadRefreshToken = rt;
                return false;
            }
            if (d.refreshToken && d.refreshToken !== rt) updateOmenRefreshToken(saved.walletAddress, d.refreshToken);
            refreshed = auth;
            activityClient?.onAuthChanged(currentAuth());
            console.info('[OmenX telemetry] pass refreshed');
            return true;
        } catch (err) {
            refreshFailedAt = Date.now();
            console.warn('[OmenX telemetry] pass refresh error:', err?.message);
            return false;
        } finally {
            refreshing = null;
        }
    })();
    return refreshing;
}

let activityClient = null;

function startWebsiteClient() {
    activityClient = new OmenXActivityClient({
        apiBaseUrl: API_BASE,
        getAuth: () => currentAuth(),
        onDiagnostic: logTelemetryDiagnostic,
        // A 401 on a pass that hasn't expired by our clock (e.g. one without `exp`): try a refresh once.
        onUnauthorized: () => { refreshPass().catch(() => {}); },
    });

    // The saved sign-in changed (this tab via applyOmenAuth/clearOmenAuth, or another tab).
    window.addEventListener('storage', (e) => {
        if (e.key !== OMEN_AUTH_KEY) return;
        const saved = readOmenAuth();
        if (!saved || (refreshed && !sameWallet(refreshed.walletAddress, saved.walletAddress))) refreshed = null;
        activityClient.onAuthChanged(currentAuth());
    });

    // Registers now if the pass is live; otherwise arms the client so the next pass registers itself.
    activityClient.startSession().catch(() => {});
}

// ---- the one call the game uses ---------------------------------------------------------------

let started = false;
let currentMode = 'off';

export function initOmenTelemetry() {
    if (started) return;
    started = true;
    currentMode = mode();
    if (currentMode === 'website') {
        try { startWebsiteClient(); } catch (err) { console.warn('[OmenX telemetry] start failed:', err?.message); }
    }
    // Player actions announced by base44Client.js (purchases, claims, squad actions).
    window.addEventListener(PLAYER_ACTION_EVENT, (e) => {
        const { name, props } = e.detail || {};
        if (name) reportOmenActivity(name, props);
    });
}

export function reportOmenActivity(name, props) {
    try {
        if (!started) initOmenTelemetry();
        if (currentMode === 'arcade') {
            omenx.reportActivity(name, props);
            return;
        }
        if (currentMode !== 'website' || !activityClient) return;
        const auth = currentAuth();
        if (!auth) return; // no Omen sign-in on this browser: nothing to report against
        if (needsRefresh(auth) && readOmenAuth()?.refreshToken) {
            // Out (or nearly out) of pass: get a new one first, then report (well inside Omen's 55 s window).
            refreshPass().then(() => { activityClient.reportActivity(name, props); }).catch(() => {});
            return;
        }
        activityClient.reportActivity(name, props);
    } catch {}
}
