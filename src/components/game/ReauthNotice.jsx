import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const KEY = 'omen_reauth_notice';

const MESSAGES = {
    weekly: 'Weekly session refresh. Sign in and reconnect your wallet to keep balances, purchases and rewards working.',
    stale: 'Your wallet session expired, so we signed you out. Sign in and reconnect your wallet — nothing was lost and you were not charged.',
};

// Explains WHY the player was suddenly signed out. forceOmenReauth writes the
// flag just before dropping the session; omenx.js clears it once fresh auth
// lands. Without this the forced logout reads as a bug to the player.
export default function ReauthNotice() {
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const read = () => {
            try {
                const raw = localStorage.getItem(KEY);
                if (!raw) { setMsg(''); return; }
                const { kind } = JSON.parse(raw);
                setMsg(MESSAGES[kind] || MESSAGES.stale);
            } catch { setMsg(''); }
        };
        read();
        window.addEventListener('storage', read);
        return () => window.removeEventListener('storage', read);
    }, []);

    if (!msg) return null;

    return (
        <div className="mt-1 max-w-xs text-[11px] text-amber-200 bg-amber-950/60 border border-amber-600/60 rounded-lg px-3 py-2 text-left flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{msg}</span>
        </div>
    );
}