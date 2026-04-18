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
        const { walletAddress } = await req.json();

        if (!walletAddress) return Response.json({ error: 'walletAddress required' }, { status: 400 });

        const week_id = getCurrentWeekId();
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id, user_id: walletAddress });

        return Response.json({ contribution: contribs.length > 0 ? contribs[0] : null });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});