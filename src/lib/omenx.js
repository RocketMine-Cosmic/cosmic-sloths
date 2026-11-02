// Omen Web SDK 2.4.0 — sign in once inside the Omen Arcade (F-002, 2 Nov 2026).
//
// The SDK runs ONLY when the game is framed by something other than the Base44 builder (in
// practice: the Omen Arcade). There the Arcade hands the frame a 15-minute pass, posts a new one
// about 2 minutes before it ends, and tells us when the player signs out of the Arcade. Each pass
// is written into the game's saved sign-in (omenAuthStore.js), which the rest of the game reads.
//
// On cosmic-sloths.com in its own tab the SDK is not started at all: our own sign-in owns the saved
// sign-in there (omenxRedirectAuth.js, OmenXCallback.jsx, omenSessionRefresh.js). That keeps the
// SDK's own stored session (from the 1.x popup) from ever overwriting it.
//
// Replaces the 1.x code that posted `omenx_request_auth` to '*' and the App.jsx listener that took
// `omenx_auth` from any origin: 2.4.0 talks only to the page that frames us, and only when that page
// is the Omen Arcade (https://app.omen.foundation).

import { OmenXGameSDK } from '@omen.foundation/game-sdk';
import { isEmbeddedForPlayers } from '@/lib/frameContext';
import { applyOmenAuth, clearOmenAuth, readOmenAuth, setReauthNotice } from '@/lib/omenAuthStore';

const inArcadeFrame = () => isEmbeddedForPlayers();

export const omenx = new OmenXGameSDK({
    gameId: 'cosmic-sloths',
    apiBaseUrl: 'https://api.omen.foundation',
    // Renewable 15-minute passes. The game reads the current pass from the saved sign-in, which
    // onAuth rewrites on every renewal.
    renewal: true,
    // The website's new-tab sign-in is ours (omenSessionRefresh.js), not the SDK's.
    arcadeSignIn: false,
    // No live wallet connection from the SDK: the game has never used one.
    realtime: false,
    onAuth: (authData) => {
        if (!inArcadeFrame()) return;
        // Every Arcade pass is a recorded login to our game (Edward, 24 Oct), so it counts as fresh.
        applyOmenAuth(authData, { fresh: true });
    },
    onAuthError: (err) => {
        console.warn('[OmenX] sign-in error:', err?.code || err?.message);
    },
    onLogout: () => {
        if (!inArcadeFrame()) return;
        clearOmenAuth();
    },
    // In the frame the Arcade renews the pass by itself; nothing to do here.
    onSessionExpired: () => {},
});

let started = false;

export const initOmenX = async () => {
    if (started) return;
    started = true;

    // Purchase safety net, on the website: if Omen refused a purchase because the wallet has no
    // recent login (purchaseSku answers `omenSessionStale`), drop the saved Omen sign-in so the
    // Connect Wallet button comes back, and say why. Inside the Arcade a fresh pass arrives with
    // every load, so there is nothing to drop.
    window.addEventListener('omenSessionStale', () => {
        if (inArcadeFrame()) return;
        if (!readOmenAuth()) return;
        setReauthNotice('stale');
        clearOmenAuth();
    });

    if (!inArcadeFrame()) return;

    omenx.session.subscribe(({ type, reason }) => {
        if (type === 'signedOut') {
            console.log('[OmenX] Arcade session ended:', reason);
            clearOmenAuth();
        }
    });

    try {
        await omenx.init();
    } catch (err) {
        console.warn('[OmenX] init failed:', err?.message);
    }
};
