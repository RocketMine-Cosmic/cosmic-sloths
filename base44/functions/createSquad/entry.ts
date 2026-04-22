import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const { squadName, squadTag, squadDesc, walletAddress: clientWallet, playerName, playerTitle, accessToken } = await req.json();
        
        if (!squadName || !squadTag || !clientWallet) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!accessToken) {
            return Response.json({ error: 'accessToken required' }, { status: 401 });
        }

        // Verify OmenX identity
        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) {
            return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        }
        const walletAddress = verifyResult.user.walletAddress;

        const base44 = createClientFromRequest(req);
        const tag = squadTag.toUpperCase().substring(0, 4);

        // Check for existing squad with same name or tag, and existing membership
        const [existingName, existingTag, existingMembership] = await Promise.all([
            base44.asServiceRole.entities.Squad.filter({ name: squadName }),
            base44.asServiceRole.entities.Squad.filter({ tag }),
            base44.asServiceRole.entities.SquadMember.filter({ wallet_address: walletAddress }),
        ]);

        if (existingName.length > 0) {
            return Response.json({ error: 'A squad with that name already exists. Please choose a different name.' }, { status: 409 });
        }
        if (existingTag.length > 0) {
            return Response.json({ error: 'A squad with that tag already exists. Please choose a different tag.' }, { status: 409 });
        }
        if (existingMembership.length > 0) {
            return Response.json({ error: 'You are already a member of a squad. Leave your current squad first.' }, { status: 409 });
        }

        const today = new Date().toISOString().split('T')[0];

        const squad = await base44.asServiceRole.entities.Squad.create({
            name: squadName,
            tag,
            description: squadDesc || '',
            owner_wallet: walletAddress,
            icon: '🛡️',
            weekly_kills: 0,
            current_week: today,
            daily_kills: 0,
            current_day: today,
            member_count: 1,
            xp: 0,
            level: 1
        });

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