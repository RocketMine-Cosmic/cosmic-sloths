import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Heavy endpoint — NFT + VIP ONLY. Called once per session.

function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();

        if (!walletAddress || !accessToken) {
            return Response.json({ vipLevel: 0, nfts: [] });
        }

        // Cross-check wallet against JWT payload (no /v1/oauth/user call)
        const payload = decodeJwtPayload(accessToken);
        const jwtWallet = payload?.walletAddress?.toLowerCase();
        if (jwtWallet && jwtWallet !== walletAddress.toLowerCase()) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        let apiBaseUrlEnv = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrlEnv.startsWith('http')) apiBaseUrlEnv = `https://${apiBaseUrlEnv}`;

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: apiBaseUrlEnv,
        });

        const apiBaseUrl = apiBaseUrlEnv;
        
        let bonusLevel = null;
        try {
            bonusLevel = await sdk.getPlayerGameBonusPointsLevel(walletAddress);
        } catch (e) {
            console.error('[getPlayerData] bonusLevel failed:', e.message);
            // If VIP fetch fails, just return 0 — don't break the response
            bonusLevel = 0;
        }

        const playerDataRes = await fetch(`${apiBaseUrl}/v1/players/${walletAddress}?chainId=56`, {
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