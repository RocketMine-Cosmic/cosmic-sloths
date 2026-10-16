import { omenx, getRedirectUri } from '@/lib/omenx';

// In-app browsers (Discord, X, Omen app webviews, some iOS Safari setups) block
// the SDK's OAuth popup outright. When that happens we run the same PKCE flow
// as a full-page redirect in this tab — OmenXCallback already handles the
// no-opener case (reads the verifier from sessionStorage, then returns to '/').
const b64url = (bytes) => btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function redirectToOmenAuth() {
    const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    sessionStorage.setItem(`omenx_pkce_${state}`, verifier);
    sessionStorage.setItem(`omenx_oauth_state_${state}`, state);
    const url = new URL('https://api.omen.foundation/v1/oauth/authorize');
    url.searchParams.set('client_id', 'cosmic-sloths');
    url.searchParams.set('redirect_uri', getRedirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', b64url(new Uint8Array(digest)));
    url.searchParams.set('code_challenge_method', 'S256');
    window.location.href = url.toString();
}

// Popup first (keeps the game page alive on desktop); same-tab redirect if blocked.
export async function connectOmenWallet() {
    try {
        await omenx.authenticate({ redirectUri: getRedirectUri(), enablePKCE: true });
    } catch (err) {
        if (/popup/i.test(err?.message || '')) {
            await redirectToOmenAuth();
            return;
        }
        throw err;
    }
}