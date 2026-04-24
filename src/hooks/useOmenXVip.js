import { useState, useEffect } from 'react';
import { subscribePlayerData } from '@/lib/playerDataCache';

export function useOmenXVip() {
    const [vip, setVip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribePlayerData((data) => {
            setVip(data?.vipLevel ?? null);
            setLoading(false);
        });
        return unsub;
    }, []);

    return { vip, loading };
}