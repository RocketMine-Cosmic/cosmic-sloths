import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const { squadName, squadTag, squadDesc, walletAddress, playerName, playerTitle } = await req.json();
        
        if (!squadName || !squadTag || !walletAddress) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create squad with service role to bypass RLS
        const squad = await base44.asServiceRole.entities.Squad.create({
            name: squadName,
            tag: squadTag.toUpperCase().substring(0, 4),
            description: squadDesc || '',
            owner_wallet: walletAddress,
            icon: '🛡️',
            weekly_kills: 0,
            current_week: new Date().toISOString().split('T')[0],
            daily_kills: 0,
            current_day: new Date().toISOString().split('T')[0],
            member_count: 1,
            xp: 0,
            level: 1
        });

        // Create leader member record
        const member = await base44.asServiceRole.entities.SquadMember.create({
            squad_id: squad.id,
            wallet_address: walletAddress,
            player_name: playerName || 'Leader',
            player_title: playerTitle || '',
            role: 'leader',
            last_payout_week: '',
            last_daily_payout_date: ''
        });

        return Response.json({ success: true, squad, member });
    } catch (error) {
        console.error('[createSquad]', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});