import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const { walletAddress } = await req.json();
        if (!walletAddress) return Response.json({ error: 'Missing walletAddress' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

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