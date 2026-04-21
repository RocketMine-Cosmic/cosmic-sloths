import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { oldName, newName, newTitle, accessToken } = await req.json();
        
        if (!newName) {
            return Response.json({ error: 'newName required' }, { status: 400 });
        }

        const db = base44.asServiceRole;

        // Resolve wallet address via OmenX if accessToken provided
        let walletAddress = user.wallet_address;
        if (!walletAddress && accessToken) {
            const sdk = new OmenXServerSDK({
                apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
                apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
            });
            const verifyResult = await sdk.verifyOAuthUser(accessToken);
            if (verifyResult.success) {
                walletAddress = verifyResult.user.walletAddress;
            }
        }

        // Update pilotName in PlayerSave (canonical name storage)
        if (walletAddress) {
            const saves = await db.entities.PlayerSave.filter({ wallet_address: walletAddress });
            for (const save of saves) {
                const updatedSaveData = { ...save.save_data, pilotName: newName, player_name: newName };
                await db.entities.PlayerSave.update(save.id, { save_data: updatedSaveData, updated_at: Date.now() });
            }
        }

        // Update RunScore — match by user_id and wallet_address
        const runScoresByUser = await db.entities.RunScore.filter({ user_id: user.id });
        const runScoresByWallet = walletAddress ? await db.entities.RunScore.filter({ wallet_address: walletAddress }) : [];
        
        const allRunScores = new Map();
        [...runScoresByUser, ...runScoresByWallet].forEach(s => allRunScores.set(s.id, s));
        
        for (const score of allRunScores.values()) {
            if (score.player_name !== newName || (newTitle !== undefined && score.player_title !== newTitle)) {
                await db.entities.RunScore.update(score.id, { 
                    player_name: newName,
                    player_title: newTitle !== undefined ? newTitle : score.player_title,
                });
            }
        }
        
        // Update SquadMember — match by wallet_address (primary key for squad entities)
        if (walletAddress) {
            const members = await db.entities.SquadMember.filter({ wallet_address: walletAddress });
            for (const member of members) {
                if (member.player_name !== newName || (newTitle !== undefined && member.player_title !== newTitle)) {
                    await db.entities.SquadMember.update(member.id, { 
                        player_name: newName,
                        player_title: newTitle !== undefined ? newTitle : member.player_title,
                    });
                }
            }

            // Update SquadMessage — match by wallet_address
            const messages = await db.entities.SquadMessage.filter({ wallet_address: walletAddress });
            for (const msg of messages) {
                if (msg.player_name !== newName || (newTitle !== undefined && msg.player_title !== newTitle)) {
                    await db.entities.SquadMessage.update(msg.id, { 
                        player_name: newName,
                        player_title: newTitle !== undefined ? newTitle : msg.player_title,
                    });
                }
            }

            // Update TokenSpendLog player name
            const spendLogs = await db.entities.TokenSpendLog.filter({ wallet_address: walletAddress });
            for (const log of spendLogs) {
                if (log.player_name !== newName) {
                    await db.entities.TokenSpendLog.update(log.id, { player_name: newName });
                }
            }
        }
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});