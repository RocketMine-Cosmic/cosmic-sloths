import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const { newName, newTitle, newIcon, accessToken } = await req.json();

        if (!accessToken) {
            return Response.json({ error: 'accessToken required' }, { status: 401 });
        }
        if (!newName) {
            return Response.json({ error: 'newName required' }, { status: 400 });
        }

        // Verify identity via OmenX
        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) {
            return Response.json({ error: 'Invalid access token' }, { status: 401 });
        }
        const walletAddress = verifyResult.user.walletAddress;

        const db = createClientFromRequest(req).asServiceRole;

        // Update pilotName in PlayerSave
        const saves = await db.entities.PlayerSave.filter({ wallet_address: walletAddress });
        for (const save of saves) {
            const updatedSaveData = {
                ...save.save_data,
                pilotName: newName,
                player_name: newName,
                hasSetProfileName: true,
            };
            if (newTitle !== undefined) updatedSaveData.player_title = newTitle;
            if (newIcon !== undefined) updatedSaveData.pilot_icon = newIcon;
            await db.entities.PlayerSave.update(save.id, { save_data: updatedSaveData, updated_at: Date.now() });
        }

        // Update RunScore records
        const runScores = await db.entities.RunScore.filter({ wallet_address: walletAddress });
        for (const score of runScores) {
            const updatePayload = { player_name: newName };
            if (newTitle !== undefined) updatePayload.player_title = newTitle;
            if (newIcon !== undefined) updatePayload.pilot_icon = newIcon;
            await db.entities.RunScore.update(score.id, updatePayload);
        }

        // Update SquadMember records
        const members = await db.entities.SquadMember.filter({ wallet_address: walletAddress });
        for (const member of members) {
            const updatePayload = { player_name: newName };
            if (newTitle !== undefined) updatePayload.player_title = newTitle;
            await db.entities.SquadMember.update(member.id, updatePayload);
        }

        // Update SquadMessage records
        const messages = await db.entities.SquadMessage.filter({ wallet_address: walletAddress });
        for (const msg of messages) {
            const updatePayload = { player_name: newName };
            if (newTitle !== undefined) updatePayload.player_title = newTitle;
            await db.entities.SquadMessage.update(msg.id, updatePayload);
        }

        // Update TokenSpendLog records
        const spendLogs = await db.entities.TokenSpendLog.filter({ wallet_address: walletAddress });
        for (const log of spendLogs) {
            await db.entities.TokenSpendLog.update(log.id, { player_name: newName });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('[syncProfileName]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});