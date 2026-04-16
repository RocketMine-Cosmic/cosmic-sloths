const BASE_URL = 'https://staging.api.omen.foundation/v1';

Deno.serve(async (req) => {
    try {
        const apiKey = Deno.env.get('OMENX_API_KEY');

        const res = await fetch(`${BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const text = await res.text();
        let results;
        try { results = JSON.parse(text); } catch { results = text; }

        return Response.json(results);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});