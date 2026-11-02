// The game's saved Omen sign-in (localStorage `omenx_auth_data`), written in ONE place (F-002).
//
// About twenty parts of the game read `omenx_auth_data` (wallet, access token, profile fields), so
// it stays the game's copy. What changed on 2 Nov 2026 is who fills it:
//   - inside the Omen Arcade frame: the 2.4.0 SDK, on every sign-in and every renewal (omenx.js);
//   - on the website, and the Connect Wallet fallback: our own sign-in (omenxRedirectAuth.js →
//     OmenXCallback.jsx).
// Both go through applyOmenAuth so profile fields survive and the "signed in today" stamp is set.

import { saveAuthToIndexedDB, clearAuthFromIndexedDB } from '@/lib/indexedDbAuth';
import { getCurrentPeriodIds } from '@/lib/periodIds';

export const OMEN_AUTH_KEY = 'omenx_auth_data';
export const REAUTH_NOTICE_KEY = 'omen_reauth_notice';

// UTC calendar day. A fresh Omen sign-in records a login for Omen's 30-day player session gate;
// `auth_day` is the day the saved sign-in was minted (see omenSessionRefresh.js).
export const todayUtc = () => new Date().toISOString().slice(0, 10);

export function readOmenAuth() {
    try {
        const raw = localStorage.getItem(OMEN_AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function announce(value) {
    try {
        window.dispatchEvent(new StorageEvent('storage', {
            key: OMEN_AUTH_KEY,
            newValue: value,
            storageArea: localStorage,
        }));
    } catch {}
}

// `fresh`: true when this is a new login Omen recorded (a completed sign-in, or an Arcade pass),
// false for a pass we merely restored. Only fresh logins move the `auth_day` stamp.
export function applyOmenAuth(authData, { fresh = true } = {}) {
    if (!authData?.walletAddress || !authData?.accessToken) return null;
    let existing = {};
    try { existing = readOmenAuth() || {}; } catch {}
    const sameWallet = existing.walletAddress &&
        existing.walletAddress.toLowerCase() === authData.walletAddress.toLowerCase();

    const merged = {
        ...authData,
        // The SDK calls the Omen display name `profileName`; the game reads `username`.
        username: authData.username || authData.profileName || (sameWallet ? existing.username : '') || '',
        // Profile customisations are the player's, not Omen's: keep them across sign-ins.
        player_name: existing.player_name ?? authData.username ?? authData.profileName ?? '',
        player_title: existing.player_title ?? '',
        pilot_icon: existing.pilot_icon ?? '🦥',
        auth_day: fresh ? todayUtc() : existing.auth_day,
        auth_week: fresh ? getCurrentPeriodIds().week_id : existing.auth_week,
    };
    const value = JSON.stringify(merged);
    try { localStorage.setItem(OMEN_AUTH_KEY, value); } catch {}
    try { localStorage.removeItem(REAUTH_NOTICE_KEY); } catch {}
    saveAuthToIndexedDB(merged).catch(() => {});
    announce(value);
    return merged;
}

export function clearOmenAuth() {
    try { localStorage.removeItem(OMEN_AUTH_KEY); } catch {}
    clearAuthFromIndexedDB().catch(() => {});
    announce(null);
}

// Shows the banner that explains why the player has to reconnect (ReauthNotice.jsx).
export function setReauthNotice(kind) {
    try {
        const value = JSON.stringify({ kind, at: Date.now() });
        localStorage.setItem(REAUTH_NOTICE_KEY, value);
        window.dispatchEvent(new StorageEvent('storage', { key: REAUTH_NOTICE_KEY, newValue: value, storageArea: localStorage }));
    } catch {}
}
