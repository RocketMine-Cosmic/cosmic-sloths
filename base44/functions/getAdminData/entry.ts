import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const { type, walletAddress, accessToken } = await req.json();
        
        // Verify OAuth token
        if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });
        
        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });
        const verifyResult = await sdk.verifyOAuthUser(accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        
        if (!walletAddress) return Response.json({ error: 'walletAddress required' }, { status: 400 });

        if (type === 'pools') {
            const pools = await base44.asServiceRole.entities.TokenPool.list('-created_date', 100);
            return Response.json({ pools });
        }

        if (type === 'logs') {
            const logs = await base44.asServiceRole.entities.TokenSpendLog.list('-created_date', 50);
            return Response.json({ logs });
        }

        if (type === 'payouts') {
            const payouts = await base44.asServiceRole.entities.PayoutLog.list('-created_date', 200);
            return Response.json({ payouts });
        }

        return Response.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});