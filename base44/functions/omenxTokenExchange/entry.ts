const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/?omenx_callback=1';

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

        const res = await fetch('https://api.omen.foundation/v1/oauth/token', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${apiKey}`
            },
            body: body.toString(),
        });

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { error: text }; }

        return Response.json(data, { status: res.status });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});