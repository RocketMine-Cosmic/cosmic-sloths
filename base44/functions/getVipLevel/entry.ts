import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();
        if (!walletAddress || !accessToken) {
            return Response.json({ error: 'Missing walletAddress and accessToken' }, { status: 400 });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });

        // Verify OAuth token and ensure wallet ownership
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) {
            return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        }
        
        const authenticatedWallet = verifyResult.user.walletAddress;
        if (walletAddress !== authenticatedWallet) {
            return Response.json({ error: 'Forbidden: Can only view your own VIP level' }, { status: 403 });
        }

        const [vipStatus, bonusLevel] = await Promise.all([
            sdk.getPlayerVipStatus(walletAddress).catch(() => null),
            sdk.getPlayerGameBonusPointsLevel(walletAddress).catch(() => null),
        ]);

        // Use bonusLevel (1–21) as the VIP level; fallback to 0
        const vipLevel = bonusLevel ?? 0;

        return Response.json({ vipLevel, vipStatus });
    } catch (error) {
        console.error('[getVipLevel]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});