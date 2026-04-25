import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import { createClient } from 'npm:@base44/sdk@0.8.25';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

const verifyCache = new Map();
const VERIFY_CACHE_TTL = 60 * 60 * 1000;

async function verifyToken(sdk, accessToken) {
    const now = Date.now();
    const cached = verifyCache.get(accessToken);
    if (cached && cached.expiresAt > now) return { success: true, walletAddress: cached.walletAddress };
    const result = await sdk.verifyOAuthUser(accessToken);
    if (result.success) {
        verifyCache.set(accessToken, { walletAddress: result.user.walletAddress, expiresAt: now + VERIFY_CACHE_TTL });
        if (verifyCache.size > 500) {
            for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
        }
    }
    return result.success ? { success: true, walletAddress: result.user.walletAddress } : { success: false };
}

Deno.serve(async (req) => {
    try {
        const { newName, newTitle, newIcon, accessToken } = await req.json();

        if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });
        if (!newName) return Response.json({ error: 'newName required' }, { status: 400 });

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await verifyToken(sdk, accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid access token' }, { status: 401 });
        const walletAddress = verifyResult.walletAddress;

        // Update PlayerSave — merge name into existing save_data
        const saves = await db.entities.PlayerSave.filter({ wallet_address: walletAddress });
        if (saves.length === 0) return Response.json({ error: 'PlayerSave not found' }, { status: 404 });

        const save = saves[0];
        const existingData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : (save.save_data || {});
        const mergedData = { ...existingData, pilotName: newName, player_name: newName, hasSetProfileName: true, updated_at: Date.now() };
        if (newTitle !== undefined) mergedData.player_title = newTitle;
        if (newIcon !== undefined) mergedData.pilot_icon = newIcon;

        await db.entities.PlayerSave.update(save.id, { save_data: mergedData });

        // Update RunScore records in parallel (non-fatal)
        const scoreUpdateData = { player_name: newName };
        if (newTitle !== undefined) scoreUpdateData.player_title = newTitle;
        if (newIcon !== undefined) scoreUpdateData.pilot_icon = newIcon;

        const memberUpdateData = { player_name: newName };
        if (newTitle !== undefined) memberUpdateData.player_title = newTitle;

        const msgUpdateData = { player_name: newName };
        if (newTitle !== undefined) msgUpdateData.player_title = newTitle;

        try {
            const [scores, members, messages] = await Promise.all([
                db.entities.RunScore.filter({ wallet_address: walletAddress }),
                db.entities.SquadMember.filter({ wallet_address: walletAddress }),
                db.entities.SquadMessage.filter({ wallet_address: walletAddress }),
            ]);

            await Promise.all([
                ...scores.map(s => db.entities.RunScore.update(s.id, scoreUpdateData)),
                ...members.map(m => db.entities.SquadMember.update(m.id, memberUpdateData)),
                ...messages.map(m => db.entities.SquadMessage.update(m.id, msgUpdateData)),
            ]);
        } catch (err) {
            console.warn('[syncProfileName] Secondary record update failed (non-fatal):', err.message);
        }

        console.log('[syncProfileName] Synced for wallet:', walletAddress, '→', newName);
        return Response.json({ success: true });
    } catch (error) {
        console.error('[syncProfileName]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});