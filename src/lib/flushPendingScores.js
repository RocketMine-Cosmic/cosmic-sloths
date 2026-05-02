// Background retry for runs that couldn't be saved at game-over time
// (e.g. server hiccup, lost connection, expired session during a long endless run,
// or — critically on Android — a tab kill while the run was still active).
// Called on app launch, when a new game starts, and whenever the wallet link is
// (re)established — drains the queue without blocking UI.
import { base44 } from '@/api/base44Client';
import { readRunSnapshot, clearRunSnapshot } from '@/lib/runSnapshot';
import { getOmenXUserSync } from '@/lib/omenxUser';

let flushing = false;
let listenersBound = false;

// If a tab kill left an orphan run snapshot, promote it into the saveScore queue
// so the normal recovery path can submit it. Only runs once per launch — if the
// promotion succeeds, the snapshot is cleared.
function promoteOrphanSnapshot() {
    try {
        const snap = readRunSnapshot();
        if (!snap?.stats) return;
        const user = getOmenXUserSync();
        if (!user) return; // wait until auth is available
        const stats = snap.stats;
        const scoreData = {
            player_name: user.player_name || user.full_name || '',
            player_title: user.data?.player_title || '',
            pilot_icon: user.pilot_icon || user.data?.pilot_icon || '🦥',
            time_survived: stats.time,
            level: stats.level,
            kills: stats.kills,
            character_id: stats.characterId,
            arena_id: stats.arenaId,
            gold: stats.gold,
            fragments: stats.fragments || 0,
            is_victory: false, // tab kills are always abandoned
            encountered: stats.encountered || [],
            enemyKills: stats.enemyKills || {},
        };
        const payload = { scoreData, squadStats: null };
        const queue = JSON.parse(localStorage.getItem('pending_score_saves') || '[]');
        queue.push({ payload, queuedAt: snap.takenAt || Date.now(), reason: 'tab_killed' });
        while (queue.length > 20) queue.shift();
        localStorage.setItem('pending_score_saves', JSON.stringify(queue));
        clearRunSnapshot();
        console.log('[flushPendingScores] Promoted orphan run snapshot (tab kill recovery).');
    } catch (e) {
        console.warn('[flushPendingScores] Snapshot promotion failed:', e?.message);
    }
}

export async function flushPendingScores() {
    if (flushing) return;
    flushing = true;
    try {
        // First pass: pull any orphan snapshot into the queue.
        promoteOrphanSnapshot();

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
                console.log('[flushPendingScores] Recovered queued run from', new Date(entry.queuedAt).toISOString(), entry.reason ? `(${entry.reason})` : '');
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