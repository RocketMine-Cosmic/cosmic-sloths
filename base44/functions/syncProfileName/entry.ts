import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

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

        const appId = Deno.env.get('BASE44_APP_ID');
        const syncSecret = Deno.env.get('SYNC_SAVE_SECRET');

        // Fetch existing PlayerSave, deep-merge, then update
        const playerSaveUrl = `https://api.base44.com/apps/${appId}/entities/PlayerSave`;
        const getRes = await fetch(`${playerSaveUrl}?wallet_address=${encodeURIComponent(walletAddress)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            }
        });
        if (!getRes.ok) throw new Error(`PlayerSave GET failed: ${getRes.status}`);
        const saves = await getRes.json();
        if (!saves || saves.length === 0) throw new Error('PlayerSave not found');
        
        const save = saves[0];
        const existingSaveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
        const mergedData = { ...existingSaveData, pilotName: newName, hasSetProfileName: true, updated_at: Date.now() };
        if (newTitle !== undefined) mergedData.player_title = newTitle;
        if (newIcon !== undefined) mergedData.pilot_icon = newIcon;
        
        const saveRes = await fetch(`${playerSaveUrl}/${save.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({ save_data: mergedData })
        });
        if (!saveRes.ok) throw new Error(`PlayerSave PUT failed: ${saveRes.status} ${saveRes.statusText}`);

        // Update RunScore records
        const runScoreUrl = `https://api.base44.com/apps/${appId}/entities/RunScore`;
        const scoreUpdateData = { player_name: newName };
        if (newTitle !== undefined) scoreUpdateData.player_title = newTitle;
        if (newIcon !== undefined) scoreUpdateData.pilot_icon = newIcon;

        const scoreRes = await fetch(`${runScoreUrl}?wallet_address=${encodeURIComponent(walletAddress)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify(scoreUpdateData)
        });
        if (!scoreRes.ok) console.warn(`[syncProfileName] RunScore PATCH returned ${scoreRes.status}`);

        // Update SquadMember records
        const squadMemberUrl = `https://api.base44.com/apps/${appId}/entities/SquadMember`;
        const memberUpdateData = { player_name: newName };
        if (newTitle !== undefined) memberUpdateData.player_title = newTitle;

        const memberRes = await fetch(`${squadMemberUrl}?wallet_address=${encodeURIComponent(walletAddress)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify(memberUpdateData)
        });
        if (!memberRes.ok) console.warn(`[syncProfileName] SquadMember PATCH returned ${memberRes.status}`);

        // Update SquadMessage records
        const messageUrl = `https://api.base44.com/apps/${appId}/entities/SquadMessage`;
        const msgUpdateData = { player_name: newName };
        if (newTitle !== undefined) msgUpdateData.player_title = newTitle;

        const msgRes = await fetch(`${messageUrl}?wallet_address=${encodeURIComponent(walletAddress)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify(msgUpdateData)
        });
        if (!msgRes.ok) console.warn(`[syncProfileName] SquadMessage PATCH returned ${msgRes.status}`);

        // Update TokenSpendLog records
        const logUrl = `https://api.base44.com/apps/${appId}/entities/TokenSpendLog`;
        const logRes = await fetch(`${logUrl}?wallet_address=${encodeURIComponent(walletAddress)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({ player_name: newName })
        });
        if (!logRes.ok) console.warn(`[syncProfileName] TokenSpendLog PATCH returned ${logRes.status}`);

        console.log('[syncProfileName] Synced for wallet:', walletAddress);
        return Response.json({ success: true });
    } catch (error) {
        console.error('[syncProfileName]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});