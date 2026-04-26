import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshStaticPlayerData, getStaticRefreshCooldownEnd } from '@/lib/playerDataCache';
import { SoundManager } from '../../game/SoundManager';

/**
 * Manual-refresh button for VIP level + NFT inventory.
 * - 24h cooldown (server-side data rarely changes; VIP never decreases).
 * - Lives on the Profile page so users can pull updates after buying NFTs / leveling VIP.
 */
export default function RefreshOmenXDataButton() {
    const [cooldownEnd, setCooldownEnd] = useState(getStaticRefreshCooldownEnd());
    const [now, setNow] = useState(Date.now());
    const [busy, setBusy] = useState(false);
    const [flash, setFlash] = useState(null); // 'ok' | 'fail' | null

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const remaining = Math.max(0, cooldownEnd - now);
    const onCooldown = remaining > 0;

    const formatRemaining = (ms) => {
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const handleClick = async () => {
        if (onCooldown || busy) return;
        SoundManager.playUIClick();
        setBusy(true);
        try {
            const res = await refreshStaticPlayerData();
            setCooldownEnd(res.cooldownEnd);
            setFlash(res.ok ? 'ok' : 'fail');
            setTimeout(() => setFlash(null), 2500);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={onCooldown || busy}
            title={onCooldown ? `Available in ${formatRemaining(remaining)}` : 'Refresh VIP & NFT data from OmenX'}
            className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border font-bold text-[10px] md:text-xs transition-colors ${
                flash === 'ok'
                    ? 'bg-emerald-900/40 border-emerald-500/60 text-emerald-300'
                    : onCooldown
                        ? 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed'
                        : busy
                            ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
                            : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400'
            }`}
        >
            <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 ${busy ? 'animate-spin' : ''}`} />
            <span className="uppercase tracking-wider">
                {busy ? 'Refreshing…' : flash === 'ok' ? 'Updated' : onCooldown ? `Refresh in ${formatRemaining(remaining)}` : 'Refresh VIP & NFTs'}
            </span>
        </button>
    );
}