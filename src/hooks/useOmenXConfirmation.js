import { useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useOmenXConfirmation(pageId) {
    const [pending, setPending] = useState(null);
    const callbackRef = useRef(null);
    // Track the global purchases-disabled flag so the 24h "skip confirm" path
    // doesn't bypass the modal — otherwise admins disabling purchases would only
    // affect first-time confirmers; users who'd opted into 24h skip would still
    // hit the server and get a 503 with no UI explanation.
    const purchasesDisabledRef = useRef(false);
    useEffect(() => {
        let cancelled = false;
        const fetchOnce = () => {
            base44.functions.invoke('getMaintenanceMode', {})
                .then(res => { if (!cancelled) purchasesDisabledRef.current = !!res.data?.omenxPurchasesDisabled; })
                .catch(() => {});
        };
        fetchOnce();
        // Poll every 15s — matches the server cache TTL so admins flipping the
        // kill-switch mid-run see effect within ~15s instead of waiting for the
        // run to end.
        const t = setInterval(fetchOnce, 15_000);
        return () => { cancelled = true; clearInterval(t); };
    }, []);

    const isDisabledFor24h = useCallback(() => {
        const disabledUntil = localStorage.getItem(`omenx_confirm_disabled_${pageId}`);
        if (!disabledUntil) return false;
        return Date.now() < parseInt(disabledUntil);
    }, [pageId]);

    const confirm = useCallback((amount, itemName, onConfirmCallback) => {
        // Force a fresh check at click time — the cached flag may be stale (last
        // poll up to 15s ago) and we MUST NOT fire the optimistic grant if the
        // kill-switch is on. Network failure → fall back to the cached value.
        const proceed = () => {
            // Block entirely if the kill-switch is on, regardless of 24h-skip.
            if (purchasesDisabledRef.current) {
                // Show the modal so the player sees the "disabled" banner
                // (instead of silently no-op'ing the click).
                callbackRef.current = onConfirmCallback;
                setPending({
                    amount, itemName,
                    onConfirm: () => {
                        setPending(null);
                        if (!purchasesDisabledRef.current && callbackRef.current) callbackRef.current();
                    },
                    onCancel: () => setPending(null),
                });
                return;
            }
            // Fast path — user opted into 24h skip and purchases are enabled.
            if (isDisabledFor24h()) {
                onConfirmCallback();
                return;
            }
            // Default — show the confirmation modal.
            callbackRef.current = onConfirmCallback;
            setPending({
                amount, itemName,
                onConfirm: () => {
                    setPending(null);
                    if (callbackRef.current) callbackRef.current();
                },
                onCancel: () => setPending(null),
            });
        };

        base44.functions.invoke('getMaintenanceMode', {})
            .then(res => { purchasesDisabledRef.current = !!res.data?.omenxPurchasesDisabled; })
            .catch(() => {})
            .finally(proceed);
    }, [isDisabledFor24h]);

    return { pending, setPending, confirm };
}