import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Heavy endpoint — NFT + VIP ONLY. Called once per session.
// Auth: Base44 session. Wallet: from linked User.wallet_address.

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

        let bonusLevel = null;
        try {
            bonusLevel = await sdk.getPlayerGameBonusPointsLevel(walletAddress);
        } catch (e) {
            console.error('[getPlayerData] bonusLevel failed:', e.message);
            bonusLevel = 0;
        }

        const playerDataRes = await fetch(`${apiBaseUrlEnv}/v1/players/${walletAddress}?chainId=56`, {
            headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
        }).then(r => r.ok ? r.json() : null).catch((e) => {
            console.error('[getPlayerData] playerDataRes failed:', e.message);
            return null;
        });

        const vipLevel = bonusLevel ?? 0;
        const nfts = playerDataRes?.nfts || [];

        console.log(`[getPlayerData] wallet=${walletAddress} vipLevel=${vipLevel} nfts=${nfts.length}`);
        return Response.json({ vipLevel, nfts });
    } catch (error) {
        console.error('[getPlayerData]', error.message);
        return Response.json({ vipLevel: 0, nfts: [] });
    }
});