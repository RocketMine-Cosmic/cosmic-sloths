Deno.serve(async (req) => {
  try {
    const { code, codeVerifier } = await req.json();

    if (!code) {
      return Response.json({ error: 'No code provided' }, { status: 400 });
    }

    const redirectUri = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';
    const apiBaseUrl = 'https://api.omen.foundation';
    const clientSecret = Deno.env.get('OMENX_API_KEY');

    if (!clientSecret) {
      return Response.json({ error: 'Missing OMENX_API_KEY secret' }, { status: 500 });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`${apiBaseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: 'cosmic-sloths',
        client_secret: clientSecret,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('[exchangeOmenXCode] Token exchange failed:', error);
      return Response.json({ error: 'Token exchange failed', details: error }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    console.log('[exchangeOmenXCode] raw token response:', JSON.stringify(tokenData));

    // Check token expiry before responding
    if (tokenData.expires_in && tokenData.expires_in <= 0) {
      return Response.json({ error: 'Token expired immediately', details: tokenData }, { status: 400 });
    }

    // wallet/username are nested inside tokenData.user
    const user = tokenData.user || {};
    return Response.json({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      walletAddress: user.walletAddress || user.wallet_address || null,
      username: user.profileName || user.username || user.name || null,
      userId: user.userId || null,
    });
  } catch (error) {
    console.error('[exchangeOmenXCode] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});