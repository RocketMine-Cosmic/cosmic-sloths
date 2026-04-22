import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Single endpoint: verify token once, return balance + VIP in one call
Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();
        if (!walletAddress || !accessToken) {
            return Response.json({ balance: 0, vipLevel: 0 });
        }

        const authSdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const balanceSdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_BALANCE_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });

        // Verify token ONCE
        const verifyResult = await authSdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) {
            return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        }
        const authenticatedWallet = verifyResult.user.walletAddress;
        if (walletAddress !== authenticatedWallet) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch player data (balance + NFTs) + VIP in parallel
        const [playerData, bonusLevel] = await Promise.all([
            balanceSdk.getPlayer(walletAddress, '56').catch(() => null),
            authSdk.getPlayerGameBonusPointsLevel(walletAddress).catch(() => null),
        ]);

        const omenxToken = playerData?.balances?.tokens?.find(t => t.symbol === 'OMENX');
        const balance = parseFloat(omenxToken?.balance ?? '0');
        const vipLevel = bonusLevel ?? 0;
        
        // Extract NFT character names
        const nfts = playerData?.nfts || [];
        const unlockedCharacters = nfts
            .map(nft => (nft.name || '').toLowerCase().trim())
            .filter(Boolean);

        return Response.json({ balance, vipLevel, unlockedCharacters });
    } catch (error) {
        console.error('[getPlayerData]', error.message);
        return Response.json({ balance: 0, vipLevel: 0 });
    }
});