import { useState, useCallback, useRef } from 'react';

export function useOmenXConfirmation(pageId) {
    const [pending, setPending] = useState(null);
    const callbackRef = useRef(null);

    const isDisabledFor24h = useCallback(() => {
        const disabledUntil = localStorage.getItem(`omenx_confirm_disabled_${pageId}`);
        if (!disabledUntil) return false;
        return Date.now() < parseInt(disabledUntil);
    }, [pageId]);

    const confirm = useCallback((amount, itemName, onConfirmCallback) => {
        if (isDisabledFor24h()) {
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
    }, [isDisabledFor24h]);

    return { pending, setPending, confirm };
}