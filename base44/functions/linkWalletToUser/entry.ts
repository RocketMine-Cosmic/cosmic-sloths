import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifyOAuthUser } from '../../shared/omenxRest.ts';
import { forgetVerifiedWallet } from '../../shared/verifiedMe.ts';

// Links the OmenX wallet to the currently-authenticated Base44 user.
// Called once after OmenX + Base44 login both succeed.
// Verifies the OmenX accessToken to prevent users from claiming arbitrary wallets.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // base44.auth.me() THROWS when there's no auth context — catch it for a clean 401.
        let me = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { walletAddress: clientWallet, accessToken } = await req.json();
        if (!clientWallet || !accessToken) {
            return Response.json({ error: 'walletAddress and accessToken required' }, { status: 400 });
        }

        // Verify the OmenX token actually owns this wallet
        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;
        const verify = await verifyOAuthUser(accessToken, Deno.env.get('OMENX_AUTH_API_KEY'), apiBaseUrl);
        if (!verify.success) {
            return Response.json({ error: 'Invalid OmenX token' }, { status: 401 });
        }

        const verifiedWallet = verify.user.walletAddress.toLowerCase();
        if (verifiedWallet !== clientWallet.toLowerCase()) {
            return Response.json({ error: 'Wallet mismatch' }, { status: 401 });
        }

        // 2026-10-21: record the VERIFIED wallet in the server-only WalletLink table. This,
        // not User.wallet_address, is what every function trusts (see shared/verifiedMe.ts).
        // Upsert one row per user, by the service role — players can't write this table.
        const db = base44.asServiceRole;
        const existing = await db.entities.WalletLink.filter({ user_id: me.id }, '-updated_date', 5);
        if (existing.length > 0) {
            if (existing[0].wallet_address !== verifiedWallet) {
                await db.entities.WalletLink.update(existing[0].id, {
                    wallet_address: verifiedWallet, source: 'omen_verified', verified_at_ms: Date.now(),
                });
            }
            // Tidy any accidental duplicates for this user.
            for (const extra of existing.slice(1)) {
                try { await db.entities.WalletLink.delete(extra.id); } catch {}
            }
        } else {
            await db.entities.WalletLink.create({
                user_id: me.id, wallet_address: verifiedWallet, source: 'omen_verified', verified_at_ms: Date.now(),
            });
        }
        forgetVerifiedWallet(me.id);

        // Still mirror it onto the User record — the browser reads it for display and to
        // decide whether to re-link. It is NOT trusted by the server any more.
        if (me.wallet_address !== verifiedWallet) {
            await base44.auth.updateMe({ wallet_address: verifiedWallet });
        }

        return Response.json({ success: true, wallet: verifiedWallet, userId: me.id });
    } catch (error) {
        console.error('[linkWalletToUser]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});