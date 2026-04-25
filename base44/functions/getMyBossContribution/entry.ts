import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getCurrentWeekId() {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${now.getUTCFullYear()}-W${String(isoWeek).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ error: 'OmenX wallet not linked' }, { status: 400 });
        }

        const week_id = getCurrentWeekId();
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id, user_id: wallet });
        return Response.json({ contribution: contribs.length > 0 ? contribs[0] : null });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});