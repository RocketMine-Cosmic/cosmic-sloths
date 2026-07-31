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
/**
 * Drops the ENTIRE session — Omen AND Base44 — so the player re-runs the full
 * sign-in chain: Base44 Sign In → Connect Wallet → PKCE → recorded Omen session.
 *
 * Why the full chain and not just Omen: clearing Omen alone sends the player
 * straight to Omen's authorize page, which shows a bare "Connect Account" card
 * when there's no Omen session in that browser — a dead end. It also leaves the
 * stale wallet linked on the Base44 User record, so the backend keeps asking
 * Omen about a wallet with no session and keeps 404ing. A full logout re-runs
 * linkWalletToUser after fresh auth and rebuilds the whole chain.
 *
 * Never fires during a run — a mid-run bounce would cost the player their score.
 * Dynamic imports keep this module free of an import cycle (omenx.js imports
 * stampAuthWeek from here).
 */
export async function forceOmenReauth(reason, kind = 'stale') {
    if (window.location.pathname.startsWith('/game')) {
        console.warn(`[omenSession] ${reason} — deferring re-auth until the run ends.`);
        return false;
    }
    console.log(`[omenSession] ${reason} — clearing Omen + Base44 session for a full re-login.`);

    // Tell the login gate why it's showing, so the forced sign-out doesn't read
    // as a bug. Cleared by omenx.js onAuth once fresh auth lands.
    try { localStorage.setItem('omen_reauth_notice', JSON.stringify({ kind, at: Date.now() })); } catch {}

    // Flush the save first so nothing in-flight is lost to the logout reload.
    try {
        const { SaveManager } = await import('@/game/SaveManager');
        await SaveManager.syncToBackend();
    } catch (e) {
        console.error('[omenSession] save flush failed:', e?.message);
    }

    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    try { await clearAuthFromIndexedDB(); } catch {}
    try {
        window.dispatchEvent(new StorageEvent('storage', {
            key: STORAGE_KEY,
            newValue: null,
            storageArea: localStorage,
        }));
    } catch {}
    try {
        const { omenx } = await import('@/lib/omenx');
        await omenx.logout();
    } catch {}
    try {
        const { base44 } = await import('@/api/base44Client');
        await base44.auth.logout();
    } catch {}
    window.location.reload();
    return true;
}

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

    // Only ever force ONE re-auth per browser per ISO week. Without this guard,
    // sessions that can never carry a mint stamp — auth pushed in by the Omen
    // parent page, where no PKCE flow runs — loop forever: we clear the session,
    // the parent immediately pushes the same unstamped blob back, and we clear it
    // again on the next boot. That reads to the player as "I can't log in at all".
    // One forced logout per week still flushes stale sessions; after that the
    // player is left alone (and can reconnect manually) until the next rollover.
    try {
        if (localStorage.getItem('omen_reauth_forced_week') === week_id) return false;
    } catch {}

    // No stamp = auth minted before this feature existed, so its true age is
    // unknown — it could be a month+ old and already refused by the developer
    // API. Treat unknown as stale and clear it: that's the one-time sweep that
    // flushes every legacy session on its owner's next refresh. After this,
    // every blob is stamped, so nobody hits this branch twice.
    if (parsed.auth_week === week_id) return false;

    const why = parsed.auth_week
        ? `Auth minted in ${parsed.auth_week}, now ${week_id}`
        : 'Auth has no mint week (legacy session of unknown age)';
    // Mark BEFORE the logout — forceOmenReauth reloads the page, so anything
    // after it never runs.
    try { localStorage.setItem('omen_reauth_forced_week', week_id); } catch {}
    return forceOmenReauth(why, 'weekly');
}

/** Stamps the current ISO week onto an auth blob at mint time. */
export function stampAuthWeek(authData) {
    if (!authData) return authData;
    return { ...authData, auth_week: getCurrentPeriodIds().week_id };
}