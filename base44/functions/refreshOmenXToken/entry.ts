// Fresh Omen pass for session telemetry on cosmic-sloths.com (T-006, 24 Nov 2026).
//
// Why this exists: on the website our own Omen sign-in (exchangeOmenXCode) gives a pass that lasts
// 1 hour, and the daily silent refresh runs once a day. Omen's telemetry needs a live game-scoped
// pass, so without this a website session stops reporting an hour after the morning sign-in.
// Omen issues a refresh token to confidential clients (we swap the code with our secret), and
// redeeming it is key-gated: POST /v1/oauth/token/refresh with our API key. A browser can't do that,
// so the page sends the refresh token here and gets a new pass back.
//
// The new pass is used ONLY by the telemetry client, in memory (src/lib/omenTelemetry.js). The
// game's saved sign-in, login flow and User.wallet_address are untouched. No OmenAuthEvent row is
// written: a refresh is not a sign-in.
//
// Called only by the game's pages, so it goes live with the publish. Costs one Omen request per
// refresh (about one per hour of website play per player) — see run-book §1.
//
// Never logs tokens.

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });
    const body = await req.json().catch(() => ({}));
    const refreshToken = body?.refreshToken;
    if (typeof refreshToken !== 'string' || refreshToken.length < 10 || refreshToken.length > 4096) {
      return Response.json({ error: 'refreshToken required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OMENX_AUTH_API_KEY');
    if (!apiKey) return Response.json({ error: 'Missing OMENX_AUTH_API_KEY secret' }, { status: 500 });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    let res: Response;
    try {
      res = await fetch('https://api.omen.foundation/v1/oauth/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = raw?.error?.code || raw?.error || 'refresh_failed';
      console.warn('[refreshOmenXToken] refused status=', res.status, 'code=', code);
      // 400/401/403: this refresh token is no good — the page stops trying it.
      return Response.json({ error: String(code), dead: res.status >= 400 && res.status < 500 }, { status: 200 });
    }

    // Accept both a bare token response and the { success, data } envelope.
    const d = raw?.data && (raw.data.access_token || raw.data.accessToken) ? raw.data : raw;
    const accessToken = d.access_token || d.accessToken;
    if (!accessToken) {
      console.warn('[refreshOmenXToken] ok but no access_token; keys=', Object.keys(d || {}).join(','));
      return Response.json({ error: 'no_access_token', dead: false }, { status: 200 });
    }
    const newRefresh = d.refresh_token || d.refreshToken || null;
    console.log('[refreshOmenXToken] ok expires_in=', d.expires_in ?? d.expiresIn, 'rotated=', !!(newRefresh && newRefresh !== refreshToken));

    return Response.json({
      accessToken,
      expiresIn: d.expires_in ?? d.expiresIn ?? null,
      refreshToken: newRefresh,
    });
  } catch (error) {
    console.error('[refreshOmenXToken] error:', (error as Error)?.message);
    return Response.json({ error: 'refresh_error', dead: false }, { status: 200 });
  }
});
