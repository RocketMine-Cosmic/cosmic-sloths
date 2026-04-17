import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        const redirectUri = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';
        const state = Math.random().toString(36).substring(7);
        
        const params = new URLSearchParams({
            client_id: 'cosmic-sloths',
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid profile email',
            state,
        });

        const authorizeUrl = `https://api.omen.foundation/v1/oauth/authorize?${params.toString()}`;

        return Response.json({ authorizeUrl });
    } catch (error) {
        console.error('[omenxInitiateOAuth]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});