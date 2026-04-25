import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return Response.json({ error: 'walletAddress required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user with OmenX wallet
    const updated = await base44.auth.updateMe({ 
      omenx_wallet: walletAddress 
    });

    return Response.json({ success: true, user: updated });
  } catch (error) {
    console.error('[syncOmenXWallet]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});