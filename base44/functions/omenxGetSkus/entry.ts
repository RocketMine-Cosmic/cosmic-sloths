const BASE_URL = 'https://staging.api.omen.foundation/v1';

Deno.serve(async (req) => {
    try {
        const apiKey = Deno.env.get('OMENX_API_KEY');

        // Probe /products with various auth combos
        const attempts = [
            { label: 'GET /products Bearer key', url: `/products`, headers: { 'Authorization': `Bearer ${apiKey}` } },
            { label: 'GET /products no auth', url: `/products`, headers: {} },
            { label: 'GET /store/products Bearer', url: `/store/products`, headers: { 'Authorization': `Bearer ${apiKey}` } },
            { label: 'GET /apps Bearer', url: `/apps`, headers: { 'Authorization': `Bearer ${apiKey}` } },
            { label: 'GET /apps/cosmic-sloths Bearer', url: `/apps/cosmic-sloths`, headers: { 'Authorization': `Bearer ${apiKey}` } },
        ];

        const results = {};
        for (const a of attempts) {
            const res = await fetch(`${BASE_URL}${a.url}`, { headers: a.headers });
            results[a.label] = { status: res.status, body: (await res.text()).substring(0, 500) };
        }

        return Response.json(results);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});