import { useEffect, useState } from 'react';
import { isEmbeddedForPlayers } from '@/lib/frameContext';

// Inside the Omen Arcade the Arcade hands over the player's Omen sign-in by itself, usually within
// a second of the page opening. Until it does, the game shows "Connecting via Omen Arcade…" instead
// of a Connect Wallet button (Rob, 23 Oct: hide it in the Arcade). If nothing has arrived after
// WAIT_MS — the player is signed out of the Arcade, say — the button comes back so nobody is stuck.
const WAIT_MS = 8000;
const bootAt = Date.now();

export function useArcadeWaiting(hasOmenAuth) {
    const framed = isEmbeddedForPlayers();
    const [expired, setExpired] = useState(() => Date.now() - bootAt >= WAIT_MS);

    useEffect(() => {
        if (!framed || expired) return;
        const t = setTimeout(() => setExpired(true), Math.max(0, WAIT_MS - (Date.now() - bootAt)));
        return () => clearTimeout(t);
    }, [framed, expired]);

    return framed && !hasOmenAuth && !expired;
}

// Words for the errors a Connect Wallet click can end with (omenxRedirectAuth.js).
export function connectErrorText(err) {
    const code = err?.message || '';
    if (code === 'popup_closed') return '';
    if (code === 'popup_blocked') return "Connect didn't open. Please allow pop-ups for this site and tap Connect Wallet again.";
    if (code === 'access_denied') return 'Connect cancelled.';
    return 'Connect failed. Please try again, or reload the page.';
}
