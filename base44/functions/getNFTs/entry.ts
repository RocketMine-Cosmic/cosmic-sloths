import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns ONLY the player's NFT inventory. Manual-refresh from NFT Dashboard, 24h client cooldown.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ nfts: [] });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ nfts: [] });

        let apiBaseUrlEnv = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrlEnv.startsWith('http')) apiBaseUrlEnv = `https://${apiBaseUrlEnv}`;

        const res = await fetch(`${apiBaseUrlEnv}/v1/players/${walletAddress}?chainId=56`, {
            headers: { 'Authorization': `Bearer ${Deno.env.get('OMENX_BALANCE_API_KEY')}` },
        });
        if (!res.ok) {
            console.error('[getNFTs] HTTP', res.status);
            // Return error status so frontend doesn't wipe cached NFTs (and unlocked characters)
            return Response.json({ error: `HTTP ${res.status}`, nfts: null }, { status: 502 });
        }
        const data = await res.json();
        const nfts = data?.nfts || [];
        console.log(`[getNFTs] wallet=${walletAddress} nfts=${nfts.length}`);
        return Response.json({ nfts });
    } catch (error) {
        console.error('[getNFTs]', error.message);
        return Response.json({ error: error.message, nfts: null }, { status: 502 });
    }
});