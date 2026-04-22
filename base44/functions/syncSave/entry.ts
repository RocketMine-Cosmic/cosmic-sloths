import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

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
        const { walletAddress: clientWallet, saveData, accessToken } = await req.json();

        if (!clientWallet || !saveData || !accessToken) {
            return Response.json({ error: 'walletAddress, saveData, and accessToken required' }, { status: 400 });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await verifyToken(sdk, accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        const walletAddress = verifyResult.walletAddress;

        const existing = await db.entities.PlayerSave.filter({ wallet_address: walletAddress });

        if (existing.length > 0) {
            await db.entities.PlayerSave.update(existing[0].id, {
                save_data: saveData,
                updated_at: Date.now()
            });
        } else {
            await db.entities.PlayerSave.create({
                wallet_address: walletAddress,
                save_data: saveData,
                updated_at: Date.now()
            });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('[syncSave]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});