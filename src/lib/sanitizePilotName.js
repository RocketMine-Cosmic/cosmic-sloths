// Display-time sanitiser for player names rendered in public scoreboards / chat.
// Historical RunScore / SquadMessage rows saved before the privacy fix may still
// contain real OAuth names (e.g. "John Smith" from Google sign-in). This helper
// masks anything that looks like a real name and falls back to an anonymous
// Pilot_XXXXXX handle derived from the player's wallet (or user id).
//
// Heuristics:
//  - Anonymous-looking handles ("Pilot_ABC123", "CyberSloth", emoji handles, etc.)
//    are returned as-is.
//  - Names containing a space are treated as suspect (real names typically have
//    a first + last name; gaming handles rarely do). Masked to Pilot_XXXXXX.
//  - Empty / falsy names get masked to an anonymous handle too.

const SUSPECT_RE = /\s/; // any whitespace → likely a real name

export function sanitizePilotName(name, walletOrUserId = '') {
    const fallback = walletOrUserId
        ? `Pilot_${String(walletOrUserId).slice(-6).toUpperCase()}`
        : 'Anonymous Pilot';
    if (!name || typeof name !== 'string') return fallback;
    const trimmed = name.trim();
    if (!trimmed) return fallback;
    if (SUSPECT_RE.test(trimmed)) return fallback;
    return trimmed;
}