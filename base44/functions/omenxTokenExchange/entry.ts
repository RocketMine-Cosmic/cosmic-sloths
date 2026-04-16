import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';

Deno.serve(async (req) => {
    try {
        const { code } = await req.json();
        if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const sdk = new OmenXServerSDK({ apiKey });

        // Exchange code for access token using OmenX OAuth endpoint
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
        console.log('[OmenX] Got access token');

        // Verify token and get user wallet info
        const verifyResult = await sdk.verifyOAuthUser(tokenData.access_token);
        console.log('[OmenX] Verify result:', verifyResult);

        if (!verifyResult.success) {
            return Response.json({ error: 'Token verification failed', details: verifyResult.error }, { status: 400 });
        }

        const result = {
            access_token: tokenData.access_token,
            token_type: tokenData.token_type,
            walletAddress: verifyResult.user.walletAddress,
            userId: verifyResult.user.userId,
            username: verifyResult.user.userId,
        };

        console.log('[OmenX] Final result:', result);
        return Response.json(result);
    } catch (error) {
        console.error('[OmenX] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});