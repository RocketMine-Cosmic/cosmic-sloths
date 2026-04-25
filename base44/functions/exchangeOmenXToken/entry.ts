import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { code, redirectUri } = await req.json();

    if (!code || !redirectUri) {
      return Response.json({ error: 'Missing code or redirectUri' }, { status: 400 });
    }

    const apiBaseUrl = 'https://api.omen.foundation';
    const clientSecret = Deno.env.get('OMENX_AUTH_API_KEY');

    if (!clientSecret) {
      return Response.json({ error: 'Missing OMENX_AUTH_API_KEY' }, { status: 500 });
    }

    // Exchange code for tokens (no PKCE needed)
    const tokenResponse = await fetch(`${apiBaseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: 'cosmic-sloths',
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('[exchangeOmenXToken] Failed:', error);
      return Response.json({ error: 'Token exchange failed', details: error }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    console.log('[exchangeOmenXToken] Success:', { walletAddress: tokenData.user?.walletAddress });

    return Response.json({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      walletAddress: tokenData.user?.walletAddress,
      username: tokenData.user?.profileName,
    });
  } catch (error) {
    console.error('[exchangeOmenXToken]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});