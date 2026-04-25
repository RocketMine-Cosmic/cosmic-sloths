import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useOmenXAuth } from '@/lib/OmenXAuthContext';

// After OmenX login succeeds, ensures the user is also signed in to Base44
// and links their wallet to the Base44 User record.
//
// Flow:
//   1. OmenX auth present? → check Base44 auth
//   2. Not Base44'd in? → redirect to Base44 login (returns to current page)
//   3. Base44'd in? → call linkWalletToUser once to attach wallet to user record

export default function Base44AuthLinker() {
    const { authData: omenxAuth } = useOmenXAuth();
    const linkedWalletRef = useRef(null);

    useEffect(() => {
        // No OmenX auth → nothing to do
        if (!omenxAuth?.walletAddress || !omenxAuth?.accessToken) return;

        // Already linked this wallet this session → skip
        if (linkedWalletRef.current === omenxAuth.walletAddress.toLowerCase()) return;

        let cancelled = false;

        (async () => {
            try {
                const isAuthed = await base44.auth.isAuthenticated();

                if (!isAuthed) {
                    // Not signed in to Base44 → redirect to login, come back to current URL
                    base44.auth.redirectToLogin(window.location.href);
                    return;
                }

                if (cancelled) return;

                // Signed in to both → link wallet (idempotent — backend skips if already set)
                const me = await base44.auth.me();
                const wallet = omenxAuth.walletAddress.toLowerCase();

                if (me?.wallet_address?.toLowerCase() !== wallet) {
                    await base44.functions.invoke('linkWalletToUser', {
                        walletAddress: wallet,
                        accessToken: omenxAuth.accessToken,
                    });
                    console.log('[Base44AuthLinker] ✓ Wallet linked to Base44 user');
                }

                linkedWalletRef.current = wallet;
            } catch (e) {
                console.warn('[Base44AuthLinker] failed:', e.message);
            }
        })();

        return () => { cancelled = true; };
    }, [omenxAuth?.walletAddress, omenxAuth?.accessToken]);

    return null;
}