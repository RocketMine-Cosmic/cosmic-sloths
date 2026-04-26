import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
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

// Helper: update all records matching wallet_address with the given patch.
// Done in parallel for speed; individual failures are logged but don't fail the whole sync.
async function bulkUpdateByWallet(entity, walletAddress, patch, label) {
    try {
        const records = await entity.filter({ wallet_address: walletAddress });
        if (records.length === 0) return;
        const results = await Promise.allSettled(
            records.map(r => entity.update(r.id, patch))
        );
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) console.warn(`[syncProfileName] ${label}: ${failed}/${records.length} updates failed`);
    } catch (e) {
        console.warn(`[syncProfileName] ${label} bulk update failed:`, e.message);
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
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

        // 1. Update PlayerSave (deep-merge into save_data, also update top-level player_name column)
        const saves = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });
        if (saves.length === 0) throw new Error('PlayerSave not found');

        const save = saves[0];
        const existingSaveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
        const mergedData = { ...existingSaveData, player_name: newName, updated_at: Date.now() };
        if (newTitle !== undefined) mergedData.player_title = newTitle;
        if (newIcon !== undefined) mergedData.pilot_icon = newIcon;

        await base44.asServiceRole.entities.PlayerSave.update(save.id, {
            player_name: newName,
            save_data: mergedData
        });

        // 2. Update related records in parallel
        const scorePatch = { player_name: newName };
        if (newTitle !== undefined) scorePatch.player_title = newTitle;
        if (newIcon !== undefined) scorePatch.pilot_icon = newIcon;

        const memberPatch = { player_name: newName };
        if (newTitle !== undefined) memberPatch.player_title = newTitle;

        const messagePatch = { player_name: newName };
        if (newTitle !== undefined) messagePatch.player_title = newTitle;

        await Promise.all([
            bulkUpdateByWallet(base44.asServiceRole.entities.RunScore, walletAddress, scorePatch, 'RunScore'),
            bulkUpdateByWallet(base44.asServiceRole.entities.SquadMember, walletAddress, memberPatch, 'SquadMember'),
            bulkUpdateByWallet(base44.asServiceRole.entities.SquadMessage, walletAddress, messagePatch, 'SquadMessage'),
            bulkUpdateByWallet(base44.asServiceRole.entities.TokenSpendLog, walletAddress, { player_name: newName }, 'TokenSpendLog'),
        ]);

        console.log('[syncProfileName] Synced for wallet:', walletAddress);
        return Response.json({ success: true });
    } catch (error) {
        console.error('[syncProfileName]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});