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

        // Fetch user profile with the access token to get wallet address
        let profileData = {};
        try {
            const accessToken = tokenData.access_token;
            if (accessToken) {
                const profileRes = await fetch(`${BASE_URL}/oauth/userinfo`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (profileRes.ok) {
                    profileData = await profileRes.json();
                }

                // Also try /me endpoint
                if (!profileData.walletAddress && !profileData.wallet_address) {
                    const meRes = await fetch(`${BASE_URL}/users/me`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (meRes.ok) {
                        const meData = await meRes.json();
                        profileData = { ...profileData, ...meData };
                    }
                }
            }
        } catch (profileErr) {
            console.error('[OmenX] Failed to fetch profile', profileErr.message);
        }

        // Merge token data with profile (wallet address etc.)
        const merged = {
            ...tokenData,
            ...profileData,
            // Normalise wallet address field
            walletAddress: profileData.walletAddress || profileData.wallet_address || tokenData.walletAddress || tokenData.wallet_address || null,
            username: profileData.username || profileData.name || tokenData.username || null,
            userId: profileData.id || profileData.userId || profileData.sub || tokenData.userId || null,
        };

        return Response.json(merged);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});