// Our own Omen sign-in (F-002, 2 Nov 2026). Used on cosmic-sloths.com in its own tab, and as the
// fallback Connect Wallet inside the Omen Arcade frame. Inside the Arcade the 2.4.0 SDK normally
// signs the player in by itself (src/lib/omenx.js) and this file is not needed.
//
// Why our own flow and not the SDK's signIn(): our game exchanges the code on our server
// (exchangeOmenXCode, with the client secret). The SDK would exchange it in the browser.
//
// Every flow starts at /auth/omen-start (a small script in index.html): that page makes the PKCE
// verifier and state in ITS OWN window and goes to Omen. /auth/callback (OmenXCallback.jsx) finishes
// it. Starting in the popup itself matters inside the Arcade: the framed game's storage is separate
// (partitioned) from a popup's, so a verifier saved by the frame would be invisible to the popup.
// Results come back by postMessage, checked against our own origin.
//
// Three modes:
//   popup    — from a click; the popup posts the sign-in back to this window and closes.
//   redirect — same tab (popup blocked on the website); comes back to `returnTo`.
//   silent   — same tab with prompt=none: no screen at all; comes back to `returnTo` signed in, or
//              unchanged if Omen can't sign in silently. Website only (the daily refresh).

import { isFramed } from '@/lib/frameContext';
import { applyOmenAuth } from '@/lib/omenAuthStore';

export const OMEN_AUTH_MESSAGE = 'omenx_auth';
export const OMEN_AUTH_ERROR_MESSAGE = 'omenx_auth_error';

const startUrl = (mode, returnTo) => {
    const u = new URL('/auth/omen-start', window.location.origin);
    u.searchParams.set('mode', mode);
    if (returnTo) u.searchParams.set('return', returnTo);
    return u.toString();
};

const currentPath = () => window.location.pathname + window.location.search + window.location.hash;

// Same-tab sign-in. Never inside the Arcade frame (Omen's page can't be framed).
export function redirectToOmenAuth({ silent = false, returnTo = currentPath() } = {}) {
    window.location.assign(startUrl(silent ? 'silent' : 'redirect', returnTo));
}

// Popup sign-in. Must be called straight from a click, or the browser blocks the popup.
// Resolves with the auth data; rejects with 'popup_blocked', 'popup_closed' or Omen's error code.
export function signInOmenPopup() {
    const width = 500;
    const height = 700;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
        startUrl('popup'),
        'cs_omen_signin',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    if (!popup) return Promise.reject(new Error('popup_blocked'));

    return new Promise((resolve, reject) => {
        let closedTimer = null;
        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            clearInterval(pollTimer);
            if (closedTimer) clearTimeout(closedTimer);
        };
        const onMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.source !== popup) return;
            const data = event.data || {};
            if (data.type === OMEN_AUTH_MESSAGE && data.authData?.walletAddress && data.authData?.accessToken) {
                cleanup();
                applyOmenAuth(data.authData);
                resolve(data.authData);
            } else if (data.type === OMEN_AUTH_ERROR_MESSAGE) {
                cleanup();
                reject(new Error(data.error || 'sign_in_failed'));
            }
        };
        // The popup closes itself right after posting; give that message a moment to arrive.
        const pollTimer = setInterval(() => {
            if (popup.closed && !closedTimer) {
                closedTimer = setTimeout(() => {
                    cleanup();
                    reject(new Error('popup_closed'));
                }, 1500);
            }
        }, 500);
        window.addEventListener('message', onMessage);
    });
}

// The Connect Wallet button. Popup first (keeps the game page alive). If the browser blocks it:
// on the website, same-tab sign-in; inside the Arcade frame, the error goes back to the button
// (it asks the player to allow pop-ups).
export async function connectOmenWallet() {
    try {
        return await signInOmenPopup();
    } catch (err) {
        if (err?.message === 'popup_blocked' && !isFramed()) {
            redirectToOmenAuth();
            return null;
        }
        throw err;
    }
}
