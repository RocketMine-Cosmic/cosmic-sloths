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

        console.log('[OmenX] Token response:', Object.keys(tokenData));

        // Fetch user profile with access token to get wallet address
        let userProfile = {};
        if (tokenData.access_token) {
            try {
                const meRes = await fetch(`${BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
                });
                const meText = await meRes.text();
                console.log('[OmenX] /users/me status:', meRes.status);
                console.log('[OmenX] /users/me response text:', meText);
                if (meRes.ok && meText) {
                    userProfile = JSON.parse(meText);
                    console.log('[OmenX] Parsed user profile:', userProfile);
                }
            } catch (err) {
                console.error('[OmenX] Failed to fetch user profile:', err.message);
            }
        }

        // Merge token data with user profile
        const result = {
            ...tokenData,
            ...userProfile,
            walletAddress: userProfile.walletAddress || userProfile.wallet_address || userProfile.address || null,
            username: userProfile.username || userProfile.name || null,
        };

        console.log('[OmenX] Final result:', result);
        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});