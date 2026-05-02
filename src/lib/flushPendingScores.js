// Background retry for runs that couldn't be saved at game-over time
// (e.g. server hiccup, lost connection, expired session during a long endless run).
// Called on app launch, when a new game starts, and whenever the wallet link is
// (re)established — drains the queue without blocking UI.
import { base44 } from '@/api/base44Client';

let flushing = false;
let listenersBound = false;

export async function flushPendingScores() {
    if (flushing) return;
    flushing = true;
    try {
        const raw = localStorage.getItem('pending_score_saves');
        if (!raw) return;
        let queue;
        try { queue = JSON.parse(raw); } catch { queue = []; }
        if (!Array.isArray(queue) || queue.length === 0) {
            localStorage.removeItem('pending_score_saves');
            return;
        }

        const remaining = [];
        for (const entry of queue) {
            try {
                await base44.functions.invoke('saveScore', entry.payload);
                console.log('[flushPendingScores] Recovered queued run from', new Date(entry.queuedAt).toISOString());
            } catch (e) {
                // Still failing — keep it queued for next attempt
                remaining.push(entry);
            }
        }

        if (remaining.length === 0) {
            localStorage.removeItem('pending_score_saves');
        } else {
            localStorage.setItem('pending_score_saves', JSON.stringify(remaining));
        }
    } finally {
        flushing = false;
    }
}

// Auto-flush when auth (re)establishes — covers the case where a long endless
// run lost its session, queued, and the player re-signs in. Idempotent: won't
// double-bind even if called from multiple modules.
export function bindFlushListeners() {
    if (listenersBound) return;
    listenersBound = true;
    if (typeof window === 'undefined') return;
    const handler = () => { flushPendingScores().catch(() => {}); };
    window.addEventListener('walletLinked', handler);
    // Also retry whenever the tab regains focus — a queued run from a closed-tab
    // crash gets a chance to flush as soon as the user returns.
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) handler();
    });
}