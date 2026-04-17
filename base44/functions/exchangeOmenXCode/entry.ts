Deno.serve(async (req) => {
  try {
    const { code } = await req.json();

    if (!code) {
      return Response.json({ error: 'No code provided' }, { status: 400 });
    }

    const redirectUri = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';
    const apiBaseUrl = 'https://api.omen.foundation';

    // Exchange code for tokens
    const tokenResponse = await fetch(`${apiBaseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: 'cosmic-sloths',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('[exchangeOmenXCode] Token exchange failed:', error);
      return Response.json({ error: 'Token exchange failed', details: error }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    return Response.json({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      walletAddress: tokenData.wallet_address,
      username: tokenData.username,
    });
  } catch (error) {
    console.error('[exchangeOmenXCode] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});