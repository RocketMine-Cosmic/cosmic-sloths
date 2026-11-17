import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { verifyOAuthUser } from '../../shared/omenxRest.ts';

// Links the OmenX wallet to the currently-authenticated Base44 user.
// Called once after OmenX + Base44 login both succeed.
// Verifies the OmenX accessToken to prevent users from claiming arbitrary wallets.

// ISO week id (Mon-start), same formula as exchangeOmenXCode / periodIds.js / purchaseSku.
function getWeekId(d: Date) {
    const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const isoYear = tmp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

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

        // Write wallet to the Base44 user record (only if not already set or different)
        if (me.wallet_address !== verifiedWallet) {
            await base44.auth.updateMe({ wallet_address: verifiedWallet });
        }

        // T-005 (17 Nov 2026): stamp an Omen login record for this wallet. Players who arrive
        // through the Omen Arcade (F-002) get their pass from the Arcade and never go through
        // exchangeOmenXCode, so without this the daily identity watch (K-A1) can't tell them
        // from a wallet typed onto a profile by hand. source:'link' = Omen confirmed the token
        // here; rows with no source come from the full code swap in exchangeOmenXCode.
        // Non-fatal — a logging failure must never block linking.
        try {
            const now = new Date();
            await base44.asServiceRole.entities.OmenAuthEvent.create({
                wallet_address: verifiedWallet,
                at_ms: now.getTime(),
                week_id: getWeekId(now),
                source: 'link',
            });
        } catch (e) {
            console.error('[linkWalletToUser] OmenAuthEvent stamp failed:', e?.message);
        }

        return Response.json({ success: true, wallet: verifiedWallet, userId: me.id });
    } catch (error) {
        console.error('[linkWalletToUser]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});