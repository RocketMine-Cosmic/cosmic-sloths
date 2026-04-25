import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const { walletAddress: clientWallet, initialSave, vipLevel, accessToken } = await req.json();

        if (!clientWallet || !accessToken) {
            return Response.json({ error: 'walletAddress and accessToken required' }, { status: 400 });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        const walletAddress = verifyResult.user.walletAddress;

        // Check if PlayerSave already exists
        const existing = await db.entities.PlayerSave.filter({ wallet_address: walletAddress });
        if (existing.length > 0) {
            return Response.json({ success: false, message: 'PlayerSave already exists' });
        }

        // Use provided vipLevel or default to 0
        const finalVipLevel = vipLevel || 0;
        const saveDataWithVip = { ...initialSave, vipLevel: finalVipLevel };

        const result = await db.entities.PlayerSave.create({
            wallet_address: walletAddress,
            save_data: saveDataWithVip,
            updated_at: Date.now()
        });

        return Response.json({ success: true, saveId: result.id });
    } catch (error) {
        console.error('[initializeFirstLogin]', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});