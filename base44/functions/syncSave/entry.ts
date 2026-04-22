import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        const walletAddress = verifyResult.user.walletAddress;

        const base44 = createClientFromRequest(req);

        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });

        if (existing.length > 0) {
            await base44.asServiceRole.entities.PlayerSave.update(existing[0].id, {
                save_data: saveData,
                updated_at: Date.now()
            });
        } else {
            await base44.asServiceRole.entities.PlayerSave.create({
                wallet_address: walletAddress,
                save_data: saveData,
                updated_at: Date.now()
            });
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});