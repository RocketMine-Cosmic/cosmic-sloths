// Where is the game running? (F-002 Arcade Play Mode, 23 Oct 2026)
//
// Until F-002 the game treated ANY frame as the Base44 builder preview and
// switched its sign-in gates off (App.jsx, OmenXGate.jsx, seasonGate.js used
// `window.self !== window.top`). From 6 Nov 2026 Omen Arcade opens the game
// inside a frame for real players, so "framed" no longer means "preview".
//
// isBase44Editor() is true only when the frame's parent is Base44 itself.
// Everything else that frames us (the Omen Arcade, a test page) gets the
// normal signed-in game. No imports here on purpose: seasonGate.js (game
// engine) uses this file, and it must not pull in the Base44 client.

export function isFramed() {
    if (typeof window === 'undefined') return false;
    try {
        return window.self !== window.top;
    } catch {
        // Reading window.top can throw across origins in old browsers: we are framed.
        return true;
    }
}

// Origin of the page directly framing us, or '' when the browser won't say.
// Chrome/Safari give location.ancestorOrigins; Firefox only the referrer.
export function parentOrigin() {
    if (!isFramed()) return '';
    try {
        const ao = window.location.ancestorOrigins;
        if (ao && ao.length > 0) return ao[0];
    } catch {}
    try {
        if (document.referrer) return new URL(document.referrer).origin;
    } catch {}
    return '';
}

const isBase44Host = (host) =>
    host === 'base44.com' || host.endsWith('.base44.com') || host.endsWith('.base44.app');

// True only inside the Base44 builder's preview.
export function isBase44Editor() {
    if (!isFramed()) return false;
    const origin = parentOrigin();
    if (origin) {
        try {
            return isBase44Host(new URL(origin).hostname);
        } catch {
            return false;
        }
    }
    // Parent unknown: count only Base44's own preview hostnames. The live game
    // (cosmic-sloths.com) inside the Arcade never matches this.
    try {
        const host = window.location.hostname;
        return host.startsWith('preview') && host.endsWith('.base44.app');
    } catch {
        return false;
    }
}

// Framed by something other than Base44: the Omen Arcade, or a test page.
export function isEmbeddedForPlayers() {
    return isFramed() && !isBase44Editor();
}
