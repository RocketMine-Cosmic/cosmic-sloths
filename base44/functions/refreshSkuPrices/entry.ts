import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { fetchOmenPrices, savePrices } from '../../shared/storePrices.ts';

// Scheduled every 5 minutes ("Refresh store prices" workflow). Fetches the Omen
// catalogue ONCE and saves it for every player's game to read via getSkuPrices.
// See shared/storePrices.ts for why. Admin / scheduler / AdminDash only.
async function isAdminCaller(base44, body) {
    const key = body?.adminKey || body?.args?.adminKey;
    if (key && key === Deno.env.get('AdminDash')) return true;
    try { const me = await base44.auth.me(); return me?.role === 'admin'; } catch { return false; }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json().catch(() => ({}));
        if (!(await isAdminCaller(base44, body))) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
        const db = base44.asServiceRole;
        const result = await fetchOmenPrices();
        const saved = await savePrices(db, result, 'scheduled');
        if (!result.ok) {
            console.error('[refreshSkuPrices] kept last good prices:', result.error);
            return Response.json({ ok: false, error: result.error, keptCount: saved.count || 0 });
        }
        console.log(`[refreshSkuPrices] saved ${saved.count} prices`);
        return Response.json({ ok: true, count: saved.count, fetchedAt: saved.fetchedAt });
    } catch (error) {
        console.error('[refreshSkuPrices]', error?.message || error);
        return Response.json({ ok: false, error: 'exception' }, { status: 500 });
    }
});
