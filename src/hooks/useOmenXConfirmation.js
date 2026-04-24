import { useState, useCallback, useRef } from 'react';

export function useOmenXConfirmation(pageId) {
    const [pending, setPending] = useState(null);
    const callbackRef = useRef(null);

    const isDisabledFor24h = useCallback(() => {
        // Always show confirmation modal (disabled 24h bypass)
        return false;
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