import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Tiny hook — fetches the global "OMENX purchases disabled" flag once and
// re-polls every 60s while mounted. Used by the in-run game UI so reroll /
// banish / revive / XP buff / squad ultimate buttons can show a disabled
// state up-front instead of relying solely on the OmenXConfirmation modal /
// server 503 to surface the block.
export function useOmenXPurchasesDisabled() {
    const [disabled, setDisabled] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        let cancelled = false;
        const fetchOnce = () => {
            base44.functions.invoke('getMaintenanceMode', {})
                .then(res => {
                    if (cancelled) return;
                    setDisabled(!!res.data?.omenxPurchasesDisabled);
                    setMessage(res.data?.omenxPurchasesMessage || '');
                })
                .catch(() => {});
        };
        fetchOnce();
        // Poll every 15s — matches the getMaintenanceMode server cache TTL, so
        // when an admin flips the kill-switch every active run reflects it
        // within ~15s. Previously 60s, which let players continue clicking
        // reroll/ult/etc. for a full minute after the switch was flipped.
        const t = setInterval(fetchOnce, 15_000);
        return () => { cancelled = true; clearInterval(t); };
    }, []);

    return { disabled, message };
}