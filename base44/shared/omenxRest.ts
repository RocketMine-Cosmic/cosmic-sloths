// Direct REST helpers for the OmenX developer API.
//
// WHY THIS EXISTS: we used to call these through the `@omen.foundation/game-sdk`
// npm package, but that package relies on runtime code generation (eval /
// new Function), which the Deno isolate blocks. Importing it makes a function
// fail to initialize entirely — no request ever reaches the handler. That took
// purchases, wallet linking and the admin NFT/VIP panel down.
//
// These helpers mirror the SDK's exact request contracts (verified against the
// published SDK source + live API responses), so behaviour is unchanged.

function normalizeBaseUrl(raw?: string | null) {
    let base = raw || 'https://api.omen.foundation';
    if (!base.startsWith('http')) base = `https://${base}`;
    return base.replace(/\/$/, '');
}

/**
 * Verify an OmenX OAuth access token and return the wallet it belongs to.
 * Mirrors SDK verifyOAuthUser: GET /v1/oauth/user with the game's API key as
 * the bearer plus the player's access token in x-omenx-access-token.
 *
 * Returns { success, user } on 2xx, or { success: false, statusCode, error }.
 */
export async function verifyOAuthUser(accessToken: string, apiKey?: string | null, apiBaseUrl?: string | null) {
    const base = normalizeBaseUrl(apiBaseUrl);
    const response = await fetch(`${base}/v1/oauth/user`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-omenx-access-token': accessToken,
        },
    });
    if (!response.ok) {
        let errorData: any = {};
        try { errorData = await response.json(); } catch {}
        return {
            success: false,
            statusCode: response.status,
            error: {
                code: errorData?.error?.code,
                message: errorData?.error?.message || response.statusText,
            },
        };
    }
    const user = await response.json();
    return { success: true, user };
}

/**
 * Player's VIP "game bonus points level" (1–21), or null when unavailable.
 * Mirrors SDK getPlayerGameBonusPointsLevel: GET /v1/players/:wallet/vip, then
 * reads tier.gameBonusPointsLevel (falling back to the perks map).
 */
export async function getPlayerGameBonusPointsLevel(wallet: string, apiKey?: string | null, apiBaseUrl?: string | null) {
    const w = (wallet || '').trim().toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(w)) return null;
    const base = normalizeBaseUrl(apiBaseUrl);
    const response = await fetch(`${base}/v1/players/${encodeURIComponent(w)}/vip`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) return null;
    const res = await response.json().catch(() => null);
    const tier = res?.success ? res?.data?.tier : null;
    if (!tier) return null;
    const level = tier.gameBonusPointsLevel ?? tier.perks?.GAME_BONUS_POINTS_LEVEL;
    return typeof level === 'number' && level >= 1 && level <= 21 ? level : null;
}