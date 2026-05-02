import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { squadName, squadTag, squadDesc } = await req.json();
        if (!squadName || !squadTag) return Response.json({ error: 'Missing required fields' }, { status: 400 });

        // Authoritative pilot name from PlayerSave (set via Profile). Never trust the client.
        const fallbackName = `Pilot_${walletAddress.slice(-6).toUpperCase()}`;
        let playerName = fallbackName;
        let playerTitle = '';
        try {
            const saves = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress.toLowerCase() });
            if (saves.length > 0) {
                const sd = typeof saves[0].save_data === 'string' ? JSON.parse(saves[0].save_data) : saves[0].save_data;
                const n = (sd?.player_name || saves[0].player_name || '').trim();
                if (n) playerName = n;
                const t = (sd?.player_title || '').trim();
                if (t) playerTitle = t;
            }
        } catch {}

        const tag = squadTag.toUpperCase().substring(0, 4);
        const today = new Date().toISOString().split('T')[0];

        const [existingName, existingTag, existingMembership] = await Promise.all([
            base44.asServiceRole.entities.Squad.filter({ name: squadName }),
            base44.asServiceRole.entities.Squad.filter({ tag }),
            base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress }),
        ]);

        if (existingName.length > 0) return Response.json({ error: 'A squad with that name already exists.' }, { status: 409 });
        if (existingTag.length > 0) return Response.json({ error: 'A squad with that tag already exists.' }, { status: 409 });
        if (existingMembership.length > 0) return Response.json({ error: 'You are already a member of a squad. Leave your current squad first.' }, { status: 409 });

        const squad = await base44.asServiceRole.entities.Squad.create({
            name: squadName, tag, description: squadDesc || '',
            owner_wallet: walletAddress, icon: '🛡️',
            weekly_kills: 0, current_week: today,
            daily_kills: 0, current_day: today,
            member_count: 1, xp: 0, level: 1
        });

        const member = await base44.asServiceRole.entities.SquadMember.create({
            squad_id: squad.id, wallet_address: walletAddress,
            player_name: playerName, player_title: playerTitle,
            role: 'leader', last_payout_week: '', last_daily_payout_date: ''
        });

        return Response.json({ success: true, squad, member });
    } catch (error) {
        console.error('[createSquad]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});