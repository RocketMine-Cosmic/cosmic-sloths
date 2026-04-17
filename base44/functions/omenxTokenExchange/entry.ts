import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';

Deno.serve(async (req) => {
    try {
        const { code } = await req.json();
        if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_API_KEY');
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

        // Exchange code for access token
        const tokenRes = await fetch('https://api.omen.foundation/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: 'cosmic-sloths',
                redirect_uri: REDIRECT_URI,
            }).toString(),
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('[OmenX] Token exchange failed:', tokenRes.status, err);
            return Response.json({ error: 'Token exchange failed' }, { status: tokenRes.status });
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        console.log('[OmenX] Token exchange success');

        // Use SDK server-side to verify the token and get user info
        const sdk = new OmenXServerSDK({ apiKey });
        const result = await sdk.verifyOAuthUser(accessToken);

        if (!result.success) {
            console.error('[OmenX] verifyOAuthUser failed:', result.statusCode, result.error);
            return Response.json({ error: 'Failed to verify user' }, { status: 401 });
        }

        console.log('[OmenX] User verified:', result.user.walletAddress);

        return Response.json({
            access_token: accessToken,
            token_type: tokenData.token_type || 'Bearer',
            expires_in: tokenData.expires_in,
            walletAddress: result.user.walletAddress,
            userId: result.user.userId,
            username: result.user.username,
        });
    } catch (error) {
        console.error('[OmenX] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});