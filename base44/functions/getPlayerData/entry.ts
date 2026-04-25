import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Heavy endpoint — NFT + VIP ONLY. Called once per session.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ vipLevel: 0, nfts: [] });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ vipLevel: 0, nfts: [] });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });

        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        
        let bonusLevel = null;
        try {
            bonusLevel = await sdk.getPlayerGameBonusPointsLevel(wallet);
        } catch (e) {
            console.error('[getPlayerData] bonusLevel failed:', e.message);
            bonusLevel = 0;
        }

        const playerDataRes = await fetch(`${apiBaseUrl}/v1/players/${wallet}?chainId=56`, {
            headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
        }).then(r => r.ok ? r.json() : null).catch((e) => {
            console.error('[getPlayerData] playerDataRes failed:', e.message);
            return null;
        });

        const vipLevel = bonusLevel ?? 0;
        const nfts = playerDataRes?.nfts || [];

        console.log(`[getPlayerData] wallet=${wallet} vipLevel=${vipLevel} nfts=${nfts.length}`);
        return Response.json({ vipLevel, nfts });
    } catch (error) {
        console.error('[getPlayerData]', error.message);
        return Response.json({ vipLevel: 0, nfts: [] });
    }
});