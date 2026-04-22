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

        // Check for existing squad with same name or tag
        const [existingName, existingTag] = await Promise.all([
            base44.asServiceRole.entities.Squad.filter({ name: squadName }),
            base44.asServiceRole.entities.Squad.filter({ tag: squadTag.toUpperCase().substring(0, 4) }),
        ]);
        if (existingName.length > 0) {
            return Response.json({ error: 'A squad with that name already exists. Please choose a different name.' }, { status: 409 });
        }
        if (existingTag.length > 0) {
            return Response.json({ error: 'A squad with that tag already exists. Please choose a different tag.' }, { status: 409 });
        }

        // Check the player isn't already in a squad
        const existingMembership = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress });
        if (existingMembership.length > 0) {
            return Response.json({ error: 'You are already a member of a squad. Leave your current squad first.' }, { status: 409 });
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