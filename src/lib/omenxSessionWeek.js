/**
 * OMEN SESSION FRESHNESS — weekly re-auth enforcement.
 *
 * Why: the Omen developer API only serves wallets with a recorded session in the
 * last 30 days (player reads, purchases, NFT custody all 404 PLAYER_NOT_FOUND
 * otherwise). A session is recorded when the player authenticates — i.e. when a
 * fresh access token is minted through the OAuth/PKCE flow. We never refresh the
 * cached token, so a player who never presses Logout could keep playing for
 * months on a token whose session has long gone stale, and would then start
 * getting refused mid-purchase.
 *
 * How: we reuse the safeguard that already exists. Clearing `omenx_auth_data`
 * makes OmenXGate fall back to "Connect Wallet", which runs the full PKCE flow
 * and mints a fresh token (= recorded session). All this module does is clear it
 * on a schedule.
 *
 * The schedule is the ISO weekly rollover (Mon 00:00 UTC) — the same week_id the
 * pools/payouts already run on. That gives a ~4× safety margin on the 30-day
 * window and means "re-connect on Monday" is one consistent rule players learn
 * once, rather than a rolling per-player timer.
 */
import { getCurrentPeriodIds } from '@/lib/periodIds';
import { clearAuthFromIndexedDB } from '@/lib/indexedDbAuth';

const STORAGE_KEY = 'omenx_auth_data';

/**
 * Clears stored OmenX auth if it was minted in an earlier ISO week.
 * Safe to call on every boot — a no-op when the session is current.
 * Returns true if auth was expired (caller may want to skip other boot work).
 */
export async function enforceWeeklyOmenSession() {
    let parsed;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        parsed = JSON.parse(raw);
    } catch {
        return false;
    }
    if (!parsed?.walletAddress) return false;

    const { week_id } = getCurrentPeriodIds();

    // No stamp yet (auth predates this feature) → adopt the current week so the
    // player isn't bounced the moment they update. They re-auth next rollover.
    if (!parsed.auth_week) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, auth_week: week_id }));
        } catch {}
        return false;
    }

    if (parsed.auth_week === week_id) return false;

    console.log(`[omenSession] Auth minted in ${parsed.auth_week}, now ${week_id} — clearing to force re-auth.`);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { await clearAuthFromIndexedDB(); } catch {}
    try {
        window.dispatchEvent(new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: null,
            storageArea: localStorage,
        }));
    } catch {}
    return true;
}

/** Stamps the current ISO week onto an auth blob at mint time. */
export function stampAuthWeek(authData) {
    if (!authData) return authData;
    return { ...authData, auth_week: getCurrentPeriodIds().week_id };
}