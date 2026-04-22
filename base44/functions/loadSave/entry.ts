import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const { walletAddress: clientWallet, accessToken } = await req.json();

        if (!clientWallet || !accessToken) {
            return Response.json({ saveData: null });
        }

        try {
            const sdk = new OmenXServerSDK({
                apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
                apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
            });
            const verifyResult = await sdk.verifyOAuthUser(accessToken);
            if (!verifyResult.success) {
                return Response.json({ saveData: null });
            }
            const walletAddress = verifyResult.user.walletAddress;

            const base44 = createClientFromRequest(req);
            const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });

            if (existing.length > 0) {
                return Response.json({ saveData: existing[0].save_data });
            }
        } catch {
            // Token verification failed, return null gracefully
        }

        return Response.json({ saveData: null });
    } catch (error) {
        return Response.json({ saveData: null });
    }
});