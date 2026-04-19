import { useState, useCallback } from 'react';

export function useOmenXConfirmation(pageId) {
    const [pending, setPending] = useState(null); // { amount, itemName, onConfirm, onCancel }

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

        setPending({
            amount,
            itemName,
            onConfirm: onConfirmCallback,
            onCancel: () => setPending(null),
            timestamp: Date.now()
        });
    }, [isDisabledFor24h]);

    const skipConfirmationFor24h = useCallback(() => {
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem(`omenx_confirm_disabled_${pageId}`, expiresAt.toString());
    }, [pageId]);

    return {
        pending,
        setPending,
        confirm,
        isDisabledFor24h,
        skipConfirmationFor24h
    };
}