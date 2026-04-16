const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';
const BASE_URL = 'https://staging.api.omen.foundation/v1';

Deno.serve(async (req) => {
    try {
        const { code } = await req.json();
        if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_API_KEY');

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: 'cosmic-sloths',
            client_secret: apiKey,
            redirect_uri: REDIRECT_URI,
        });

        const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${apiKey}`
            },
            body: body.toString(),
        });

        const tokenText = await tokenRes.text();
        let tokenData;
        try { tokenData = JSON.parse(tokenText); } catch { tokenData = { error: tokenText }; }

        if (!tokenRes.ok || tokenData.error) {
            return Response.json(tokenData, { status: tokenRes.status });
        }

        console.log('[OmenX] Token response keys:', Object.keys(tokenData));
        console.log('[OmenX] Full token data:', JSON.stringify(tokenData, null, 2));
        
        // Return raw token data as-is for inspection
        return Response.json(tokenData);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});