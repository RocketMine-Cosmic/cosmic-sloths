const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';

Deno.serve(async (req) => {
    try {
        const { code } = await req.json();
        if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_API_KEY');

        // Exchange code for access token
        const tokenRes = await fetch('https://api.omen.foundation/v1/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: 'cosmic-sloths',
                client_secret: apiKey,
                redirect_uri: REDIRECT_URI,
            }).toString(),
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('[OmenX] Token exchange failed:', tokenRes.status, err);
            return Response.json({ error: 'Token exchange failed' }, { status: tokenRes.status });
        }

        const tokenData = await tokenRes.json();
        console.log('[OmenX] Token exchange success, access_token:', tokenData.access_token?.slice(0, 20) + '...');

        // Return token to frontend; frontend will fetch wallet via SDK client mode
        return Response.json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type || 'Bearer',
            expires_in: tokenData.expires_in,
        });
    } catch (error) {
        console.error('[OmenX] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});