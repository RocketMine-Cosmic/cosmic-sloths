import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const { walletAddress, accessToken } = await req.json();

        if (!walletAddress || !accessToken) {
            return Response.json({ balance: 0 });
        }

        try {
            const sdk = new OmenXServerSDK({
                apiKey: Deno.env.get('OMENX_BALANCE_API_KEY'),
                apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
            });
            const verifyResult = await sdk.verifyOAuthUser(accessToken);
            if (!verifyResult.success) {
                return Response.json({ balance: 0 });
            }
            const authenticatedWallet = verifyResult.user.walletAddress;

            if (walletAddress !== authenticatedWallet) {
                return Response.json({ balance: 0, unlockedCharacters: [] });
            }

            const playerData = await sdk.getPlayer(walletAddress, '56');
            
            // Extract OMENX balance
            const omenxToken = playerData?.balances?.tokens?.find(t => t.symbol === 'OMENX');
            const balance = parseFloat(omenxToken?.balance ?? '0');
            
            // Extract NFT character names
            const nfts = playerData?.nfts || [];
            const unlockedCharacters = nfts
                .map(nft => (nft.name || '').toLowerCase().trim())
                .filter(Boolean);

            return Response.json({ balance, unlockedCharacters });
        } catch {
            // Token verification or balance fetch failed, return 0
        }

        return Response.json({ balance: 0 });
    } catch (error) {
        return Response.json({ balance: 0 });
    }
});