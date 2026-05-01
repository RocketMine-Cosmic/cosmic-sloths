// Background retry for runs that couldn't be saved at game-over time
// (e.g. server hiccup, lost connection). Called on app launch and again
// when a new game starts — quietly drains the queue without blocking UI.
import { base44 } from '@/api/base44Client';

let flushing = false;

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