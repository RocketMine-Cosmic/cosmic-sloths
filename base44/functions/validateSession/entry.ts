import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const sessionCache = new Map();
const VERIFY_CACHE_TTL = 60 * 60 * 1000;
const SESSION_CACHE_TTL = 24 * 60 * 60 * 1000;

async function verifyToken(sdk, accessToken) {
    const now = Date.now();
    const cached = sessionCache.get(accessToken);
    if (cached && cached.expiresAt > now && cached.type === 'verify') {
        return { success: true, walletAddress: cached.walletAddress };
    }
    const result = await sdk.verifyOAuthUser(accessToken);
    if (result.success) {
        sessionCache.set(accessToken, { walletAddress: result.user.walletAddress, expiresAt: now + VERIFY_CACHE_TTL, type: 'verify' });
    }
    return result.success ? { success: true, walletAddress: result.user.walletAddress } : { success: false };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { walletAddress, accessToken, sessionId } = await req.json();

        if (!walletAddress || !accessToken || !sessionId) {
            return Response.json({ isActive: false, message: 'Missing parameters' });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
        });

        const verifyResult = await verifyToken(sdk, accessToken);
        if (!verifyResult.success) {
            return Response.json({ isActive: false, message: 'Token invalid' });
        }

        const wallet = verifyResult.walletAddress;
        const sessionKey = `session:${wallet}`;
        const now = Date.now();
        const cached = sessionCache.get(sessionKey);
        
        // Check if this sessionId is the currently active one
        if (cached && cached.expiresAt > now) {
            const isActive = cached.sessionId === sessionId;
            return Response.json({ 
                isActive,
                activeSessionId: cached.sessionId,
                lastActiveTime: cached.lastActiveTime 
            });
        }

        // No active session in cache (shouldn't happen, but treat as inactive)
        return Response.json({ isActive: false, message: 'No active session' });
    } catch (error) {
        console.error('[validateSession]', error.message);
        return Response.json({ isActive: false, error: error.message }, { status: 500 });
    }
});