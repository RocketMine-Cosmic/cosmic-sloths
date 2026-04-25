import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const refreshToken = user.data?.omenx_refresh_token;
    if (!refreshToken) {
      return Response.json({ error: 'No refresh token stored' }, { status: 400 });
    }

    const response = await fetch('https://api.omen.foundation/v1/oauth/token/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[refreshOmenXToken] OmenX refresh failed:', error);
      return Response.json({ error: 'Token refresh failed' }, { status: 401 });
    }

    const data = await response.json();
    const newAccessToken = data.access_token;

    if (!newAccessToken) {
      return Response.json({ error: 'No access token in response' }, { status: 500 });
    }

    return Response.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    console.error('[refreshOmenXToken]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});