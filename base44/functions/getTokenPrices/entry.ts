import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.34';

// Live USD spot prices for OMENX / GMT / BNB on BNB Smart Chain (chainId 56).
// Used by the cosmetics shop + purchase modals to show players the exact
// token amount they'll pay for a USD-priced SKU.
//
// Cached server-side (60s TTL) — prices barely move on this scale and we want
// to keep load off the OmenX SDK regardless of how many players have the shop
// open at once.

const CHAIN_ID = 56;

// Token contract addresses on BSC. BNB is the native token — convention is
// the zero address as a placeholder when querying alongside ERC-20s.
const TOKENS = {
    OMENX: '0x992a09877b619b4755Cabe9edaf5092A956F0317',
    GMT:   '0x7Ddc52c4De30e94Be3A6A0A2b259b2850f421989',
    BNB:   '0x0000000000000000000000000000000000000000',
};

const CACHE_TTL_MS = 60 * 1000;
let _cache = null;
let _cacheExpiresAt = 0;

Deno.serve(async (_req) => {
    try {
        const now = Date.now();
        if (_cache && now < _cacheExpiresAt) {
            return Response.json({ ...(_cache), cached: true });
        }

        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;

        // The pricing endpoint requires the `prices:read` scope. We don't yet know
        // which of our existing keys has it — try each in turn and surface the
        // last error if all fail. Once we know which key has the scope, we can
        // narrow this down.
        const candidateKeys = [
            ['OMENX_API_KEY',          Deno.env.get('OMENX_API_KEY')],
            ['OMENX_AUTH_API_KEY',     Deno.env.get('OMENX_AUTH_API_KEY')],
            ['OMENX_BALANCE_API_KEY',  Deno.env.get('OMENX_BALANCE_API_KEY')],
            ['OMENX_PAYMENT_API_KEY',  Deno.env.get('OMENX_PAYMENT_API_KEY')],
            ['OMENX_REWARDS_API_KEY',  Deno.env.get('OMENX_REWARDS_API_KEY')],
        ].filter(([, v]) => !!v);

        let raw = null;
        let lastErr = null;
        let workingKeyName = null;
        const attempts = [];
        for (const [name, key] of candidateKeys) {
            try {
                const sdk = new OmenXServerSDK({ apiKey: key, apiBaseUrl });
                raw = await sdk.getTokenSpotUsdPrices(CHAIN_ID, [TOKENS.OMENX, TOKENS.GMT, TOKENS.BNB]);
                workingKeyName = name;
                attempts.push({ name, ok: true });
                break;
            } catch (e) {
                const msg = e?.message || String(e);
                lastErr = msg;
                attempts.push({ name, ok: false, err: msg.slice(0, 200) });
            }
        }
        console.log('[getTokenPrices] key attempts:', JSON.stringify(attempts));
        if (!raw) {
            return Response.json({
                error: 'No API key in this app has the `prices:read` scope yet. Generate one on the OmenX dev portal and add it as a secret.',
                attempts,
                lastErr,
            }, { status: 403 });
        }
        console.log(`[getTokenPrices] using key: ${workingKeyName}`);

        // We don't know the exact shape yet — log it for confirmation and pass through.
        console.log('[getTokenPrices] raw response:', JSON.stringify(raw).slice(0, 500));

        const payload = {
            chainId: CHAIN_ID,
            fetchedAt: now,
            raw,
        };
        _cache = payload;
        _cacheExpiresAt = now + CACHE_TTL_MS;

        return Response.json(payload);
    } catch (error) {
        console.error('[getTokenPrices]', error?.message || error);
        return Response.json({ error: error?.message || 'Failed to fetch token prices' }, { status: 500 });
    }
});