// Admin-only debug endpoint — fetches the OmenX product catalog so we can verify
// SKU prices match what the UI displays.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;

        const keys = [
            Deno.env.get('OMENX_PAYMENT_API_KEY'),
            Deno.env.get('OMENX_PAYMENT_API_KEY_2'),
        ].filter(Boolean);

        if (keys.length === 0) return Response.json({ error: 'No payment keys configured' }, { status: 500 });

        let res;
        for (const key of keys) {
            res = await fetch(`${apiBaseUrl}/v1/products`, {
                headers: { 'Authorization': `Bearer ${key}` },
            });
            if (res.ok) break;
        }
        if (!res.ok) {
            return Response.json({ error: `HTTP ${res.status}`, body: await res.text() }, { status: 500 });
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.products || data?.skus || data?.items || []);

        const body = await req.json().catch(() => ({}));
        const filter = (body.filter || '').toLowerCase();

        const simplified = list.map(sku => ({
            id: sku.sku || sku.skuId || sku.id || sku.productId,
            price: parseFloat(sku.pricesInCurrency?.OMENX ?? sku.priceInOmenx ?? sku.price ?? 0),
        })).filter(s => s.id && (!filter || s.id.toLowerCase().includes(filter)))
            .sort((a, b) => a.id.localeCompare(b.id));

        return Response.json({ count: simplified.length, products: simplified });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});