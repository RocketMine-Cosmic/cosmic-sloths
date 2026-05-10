import { useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useOmenXConfirmation(pageId) {
    const [pending, setPending] = useState(null);
    const callbackRef = useRef(null);
    // Track the global purchases-disabled flag so the 24h "skip confirm" path
    // doesn't bypass the modal — otherwise admins disabling purchases would only
    // affect first-time confirmers; users who'd opted into 24h skip would still
    // hit the server and get a 503 with no UI explanation.
    const [purchasesDisabled, setPurchasesDisabled] = useState(false);
    useEffect(() => {
        let cancelled = false;
        base44.functions.invoke('getMaintenanceMode', {})
            .then(res => { if (!cancelled) setPurchasesDisabled(!!res.data?.omenxPurchasesDisabled); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const isDisabledFor24h = useCallback(() => {
        const disabledUntil = localStorage.getItem(`omenx_confirm_disabled_${pageId}`);
        if (!disabledUntil) return false;
        return Date.now() < parseInt(disabledUntil);
    }, [pageId]);

    const confirm = useCallback((amount, itemName, onConfirmCallback) => {
        // If purchases are globally disabled, ALWAYS show the modal (so the user
        // sees the disabled banner) — never auto-fire the callback.
        if (isDisabledFor24h() && !purchasesDisabled) {
            onConfirmCallback();
            return;
        }

        // Store callback in ref to avoid stale closure
        callbackRef.current = onConfirmCallback;

        setPending({
            amount,
            itemName,
            onConfirm: () => {
                setPending(null);
                if (callbackRef.current) callbackRef.current();
            },
            onCancel: () => setPending(null),
        });
    }, [isDisabledFor24h, purchasesDisabled]);

    return { pending, setPending, confirm };
}