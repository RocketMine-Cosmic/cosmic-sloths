import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Returns VIP level + NFTs (rarely changing data).
// Client caches result for 24h and only refetches via a manual refresh button.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ vipLevel: 0, nfts: [] });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ vipLevel: 0, nfts: [] });

        let apiBaseUrlEnv = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrlEnv.startsWith('http')) apiBaseUrlEnv = `https://${apiBaseUrlEnv}`;

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: apiBaseUrlEnv,
        });

        const [bonusLevel, playerDataRes] = await Promise.all([
            sdk.getPlayerGameBonusPointsLevel(walletAddress).catch((e) => {
                console.error('[getStaticPlayerData] bonusLevel failed:', e.message);
                return 0;
            }),
            fetch(`${apiBaseUrlEnv}/v1/players/${walletAddress}?chainId=56`, {
                headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
            }).then(r => r.ok ? r.json() : null).catch((e) => {
                console.error('[getStaticPlayerData] playerData failed:', e.message);
                return null;
            }),
        ]);

        const vipLevel = bonusLevel ?? 0;
        const nfts = playerDataRes?.nfts || [];
        console.log(`[getStaticPlayerData] wallet=${walletAddress} vipLevel=${vipLevel} nfts=${nfts.length}`);
        return Response.json({ vipLevel, nfts });
    } catch (error) {
        console.error('[getStaticPlayerData]', error.message);
        return Response.json({ vipLevel: 0, nfts: [] });
    }
});