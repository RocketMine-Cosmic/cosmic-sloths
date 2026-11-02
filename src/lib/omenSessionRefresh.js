// Keeps a website player's Omen login fresh, with no sign-out (F-002, 2 Nov 2026, Rob's option A).
//
// Why: Omen's player session gate refuses balances and purchases (404 PLAYER_NOT_FOUND /
// 403 NOT_IN_GAME) for a wallet whose last recorded login to our game is over 30 days old. Until
// 2 Nov the game handled that by signing everyone out every Monday (omenxSessionWeek.js, removed).
//
// Now, on cosmic-sloths.com in its own tab, the first page open of each UTC day passes quietly
// through Omen with prompt=none: no screen, no click, about a second. With Remember approval ticked
// in the Developer Portal Omen answers with a fresh login (recorded for the gate) and the page comes
// straight back. If Omen can't do it silently (signed out of Omen, approval needed), the page comes
// back unchanged and the player keeps playing; the purchase safety net (omenx.js) catches the rare
// case where the gate then refuses a purchase.
//
// Never inside a frame (the Arcade renews the pass there), never mid-run (/game), and at most one
// attempt per browser per day, whatever the outcome — so it can never loop.
//
// Also handles `?omen_signin=1`: Omen Arcade adds it when it opens the game in a new tab and
// "Sign players in from the Arcade" is ticked in the portal. A player with no Omen sign-in yet then
// gets the same silent sign-in at once.

import { isFramed } from '@/lib/frameContext';
import { readOmenAuth, todayUtc } from '@/lib/omenAuthStore';
import { redirectToOmenAuth } from '@/lib/omenxRedirectAuth';

const TRIED_DAY_KEY = 'omen_silent_refresh_day';

function triedToday() {
    try { if (localStorage.getItem(TRIED_DAY_KEY) === todayUtc()) return true; } catch {}
    try { if (sessionStorage.getItem(TRIED_DAY_KEY) === todayUtc()) return true; } catch {}
    return false;
}

function markTried() {
    try { localStorage.setItem(TRIED_DAY_KEY, todayUtc()); } catch {}
    try { sessionStorage.setItem(TRIED_DAY_KEY, todayUtc()); } catch {}
}

// Removes ?omen_signin=1 from the address bar; returns whether it was there.
function takeArcadeSignInHint() {
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('omen_signin') !== '1') return false;
        url.searchParams.delete('omen_signin');
        window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        return true;
    } catch {
        return false;
    }
}

// Call once on page open. Returns true if the page is navigating away for the silent sign-in.
export function refreshOmenSessionIfDue() {
    if (typeof window === 'undefined') return false;
    const hint = takeArcadeSignInHint();
    if (isFramed()) return false;
    const path = window.location.pathname;
    if (path.startsWith('/game') || path.startsWith('/auth/')) return false;
    if (triedToday()) return false;

    const auth = readOmenAuth();
    const hasSession = !!(auth?.walletAddress && auth?.accessToken);

    // Website players who have connected their wallet: refresh once a day.
    // Players with no Omen sign-in: only when Omen Arcade opened us with the sign-in hint.
    const due = hasSession ? auth.auth_day !== todayUtc() : hint;
    if (!due) return false;

    markTried();
    redirectToOmenAuth({ silent: true });
    return true;
}
