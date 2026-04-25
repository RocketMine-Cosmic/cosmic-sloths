import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { walletAddress, refreshToken } = await req.json();
    if (!walletAddress) {
      return Response.json({ error: 'walletAddress required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    let user = await base44.auth.me();
    
    // If no Base44 user yet, that's OK for OmenX-only players
    // They can still play; refresh token stays in IndexedDB
    if (!user) {
      return Response.json({ 
        success: true, 
        message: 'OmenX linked without Base44 account',
        refreshTokenStored: !!refreshToken 
      });
    }

    // If Base44 user exists, sync the refresh token
    const updated = await base44.auth.updateMe({ 
      omenx_wallet: walletAddress,
      omenx_refresh_token: refreshToken || null
    });

    return Response.json({ success: true, user: updated });
  } catch (error) {
    console.error('[syncOmenXWallet]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});