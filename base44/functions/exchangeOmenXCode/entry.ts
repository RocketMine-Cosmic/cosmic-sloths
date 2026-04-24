Deno.serve(async (req) => {
  try {
    const { code, codeVerifier, redirectUri } = await req.json();

    if (!code) {
      return Response.json({ error: 'No code provided' }, { status: 400 });
    }

    if (!redirectUri) {
      return Response.json({ error: 'No redirectUri provided' }, { status: 400 });
    }
    const apiBaseUrl = 'https://api.omen.foundation';
    const clientSecret = Deno.env.get('OMENX_AUTH_API_KEY');

    if (!clientSecret) {
      return Response.json({ error: 'Missing OMENX_API_KEY secret' }, { status: 500 });
    }

    // Exchange code for tokens
    const payload = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: 'cosmic-sloths',
      client_secret: clientSecret,
    };
    
    // Include PKCE verifier if available
    if (codeVerifier) {
      payload.code_verifier = codeVerifier;
    }
    
    let tokenResponse = await fetch(`${apiBaseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('[exchangeOmenXCode] Token exchange failed:', {
        status: tokenResponse.status,
        error,
        hadVerifier: !!codeVerifier,
      });
      
      // If PKCE failed, retry once without it (fallback for missing verifier)
      if (!codeVerifier && error?.error?.code === 'INVALID_REQUEST') {
        console.log('[exchangeOmenXCode] Retrying without PKCE...');
        tokenResponse = await fetch(`${apiBaseUrl}/v1/oauth/token`, {
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
          const retryError = await tokenResponse.json();
          console.error('[exchangeOmenXCode] Retry also failed:', retryError);
          return Response.json({ error: 'Token exchange failed', details: retryError }, { status: tokenResponse.status });
        }
      } else {
        return Response.json({ error: 'Token exchange failed', details: error }, { status: tokenResponse.status });
      }
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