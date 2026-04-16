const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';

Deno.serve(async (req) => {
    try {
        const { code } = await req.json();
        if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_API_KEY');

        const res = await fetch('https://omen.dog/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code,
                client_id: 'cosmic-sloths',
                client_secret: apiKey,
                redirect_uri: REDIRECT_URI,
            }),
        });

        const data = await res.json();
        return Response.json(data, { status: res.status });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});