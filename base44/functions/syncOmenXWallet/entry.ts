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
    
    // If no Base44 user yet, check if wallet already has an account
    if (!user) {
      try {
        // Check if wallet already has an account (browser wipe recovery)
        const existingUsers = await base44.asServiceRole.entities.User.filter({
          omenx_wallet: walletAddress
        });

        if (existingUsers.length > 0) {
          console.log(`[syncOmenXWallet] Account recovered for wallet ${walletAddress}`);
          return Response.json({ 
            success: true, 
            message: 'Account recovered',
            walletRecovered: true
          });
        }

        // No account found—create it
        const email = `${walletAddress.toLowerCase()}@omenx.local`;
        const inviteRes = await base44.asServiceRole.users.inviteUser(email, 'user');
        if (!inviteRes?.success) {
          throw new Error('Failed to create Base44 user');
        }

        console.log(`[syncOmenXWallet] Created Base44 user for ${email}`);
        return Response.json({ 
          success: true, 
          message: 'Base44 account created and OmenX linked',
          userCreated: true
        });
      } catch (createErr) {
        console.error('[syncOmenXWallet] Failed to create Base44 user:', createErr);
        return Response.json({ error: 'Failed to create Base44 account' }, { status: 500 });
      }
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