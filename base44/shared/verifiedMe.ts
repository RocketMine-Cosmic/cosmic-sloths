// Who is calling? — the ONE trusted answer (2026-10-21).
//
// WHY: every player and admin check used to trust `User.wallet_address`. That field is a
// custom User field, and Base44 lets any signed-in user change their own custom fields with
// `base44.auth.updateMe(...)` straight from the browser console (it's how linkWalletToUser
// writes it, with the player's own token). So a player could type in someone else's wallet
// and be treated as that wallet: their save, their OMCADE, or admin rights.
//
// FIX: the wallet that counts is the one in `WalletLink`, an admin-only table written only by
// the server — by linkWalletToUser after Omen verifies the player's OAuth token, or by the
// one-off backfill at cut-over. `verifiedMe()` is a drop-in for `base44.auth.me()`: same
// object, but `wallet_address` is REPLACED with the verified wallet (or undefined when the
// user has none), so every existing `me.wallet_address` check keeps working unchanged.
//
// Behaviour notes:
// - Throws exactly when `auth.me()` throws (no auth context), so existing try/catch keeps working.
// - The value the player wrote is kept as `me.unverified_wallet_address` for logging only.
// - Verified wallets are cached per isolate for 60 s (a hit per call would add a DB read to
//   every function). Misses are NOT cached, so a first-time link is seen immediately.

const CACHE_MS = 60 * 1000;
const cache = new Map<string, { wallet: string; exp: number }>();

export async function getVerifiedWallet(base44: any, userId: string): Promise<string | null> {
    if (!userId) return null;
    const hit = cache.get(userId);
    if (hit && hit.exp > Date.now()) return hit.wallet;
    const rows = await base44.asServiceRole.entities.WalletLink.filter({ user_id: userId }, '-updated_date', 1);
    const wallet = (rows?.[0]?.wallet_address || '').toLowerCase() || null;
    if (wallet) cache.set(userId, { wallet, exp: Date.now() + CACHE_MS });
    return wallet;
}

export function forgetVerifiedWallet(userId: string) {
    cache.delete(userId);
}

export async function verifiedMe(base44: any): Promise<any> {
    const me = await base44.auth.me();
    if (!me) return me;
    const wallet = await getVerifiedWallet(base44, me.id);
    const out = Object.assign({}, me);
    out.unverified_wallet_address = me.wallet_address;
    out.wallet_address = wallet || undefined;
    return out;
}
