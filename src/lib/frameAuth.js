// Base44 sign-in that works inside the Omen Arcade frame (F-002, option A).
//
// Outside a frame (cosmic-sloths.com in its own tab) this is exactly the old
// behaviour: base44.auth.redirectToLogin(current page).
//
// Inside a frame a full-page redirect fails (Google and others refuse to be
// framed), and Base44's own popup helper (loginWithProvider) covers Google,
// Microsoft, Facebook and Apple but NOT email + password. So we open Base44's
// normal login page — all five methods — in a popup, with the return address
// set to /auth/frame-return. A small script in index.html on that page hands
// the access token back to this frame (same origin, checked) and closes the
// popup. The frame then reloads with ?access_token=…, the same way Base44's
// own popup helper finishes, and app-params.js stores it as usual.
//
// Not Base44's documented route: proved on a test page before players see it.

import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { isEmbeddedForPlayers } from '@/lib/frameContext';

export const FRAME_RETURN_PATH = '/auth/frame-return';
export const FRAME_AUTH_MESSAGE = 'cs_base44_frame_auth';

export function signInBase44() {
    if (!isEmbeddedForPlayers()) {
        return base44.auth.redirectToLogin(window.location.href);
    }
    return signInViaPopup();
}

function signInViaPopup() {
    const returnUrl = `${window.location.origin}${FRAME_RETURN_PATH}`;
    const loginUrl = `${appParams.appBaseUrl || ''}/login?from_url=${encodeURIComponent(returnUrl)}`;

    const width = 500;
    const height = 650;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    // Must run straight from the click, or the browser blocks the popup.
    const popup = window.open(
        loginUrl,
        'cs_base44_signin',
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
            const data = event.data;
            if (!data || data.type !== FRAME_AUTH_MESSAGE || !data.access_token) return;
            cleanup();
            const url = new URL(window.location.href);
            url.searchParams.set('access_token', data.access_token);
            window.location.href = url.toString();
            resolve();
        };
        // The popup closes itself right after posting; give that message a
        // moment to arrive before treating "closed" as "player gave up".
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
