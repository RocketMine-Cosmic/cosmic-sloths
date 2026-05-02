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

// Build a saveScore-ready payload from a raw run-stats snapshot.
function statsToPayload(stats, user) {
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
        is_victory: false, // recovered runs are always abandoned
        encountered: stats.encountered || [],
        enemyKills: stats.enemyKills || {},
    };
    return { scoreData, squadStats: null };
}

// If a tab kill left an orphan run snapshot in localStorage, promote it into the
// saveScore queue. Only runs once per launch — if the promotion succeeds, the
// snapshot is cleared.
function promoteOrphanSnapshot() {
    try {
        const snap = readRunSnapshot();
        if (!snap?.stats) return;
        const user = getOmenXUserSync();
        if (!user) return; // wait until auth is available
        const queue = JSON.parse(localStorage.getItem('pending_score_saves') || '[]');
        queue.push({ payload: statsToPayload(snap.stats, user), queuedAt: snap.takenAt || Date.now(), reason: 'tab_killed' });
        while (queue.length > 20) queue.shift();
        localStorage.setItem('pending_score_saves', JSON.stringify(queue));
        clearRunSnapshot();
        console.log('[flushPendingScores] Promoted local orphan snapshot (tab kill recovery).');
    } catch (e) {
        console.warn('[flushPendingScores] Local snapshot promotion failed:', e?.message);
    }
}

// Cloud safety net: cross-device / device-wipe recovery. Each endless boss kill
// + every 5 min of run time, the engine writes the current stats to
// PlayerSave.pendingRunSnapshot. On next launch, fetch that and queue it.
// saveScore clears the cloud snapshot when it processes the recovered run, so
// this is idempotent — failed recoveries stay queued in cloud for next launch.
async function promoteCloudSnapshot() {
    try {
        const user = getOmenXUserSync();
        if (!user?.walletAddress) return;
        const res = await base44.functions.invoke('loadSave', {});
        const saveData = res?.data?.saveData;
        const snap = saveData?.pendingRunSnapshot;
        if (!snap?.stats) return;
        const queue = JSON.parse(localStorage.getItem('pending_score_saves') || '[]');
        // De-dupe — if we already queued this snapshot from localStorage, skip.
        const dup = queue.some(e => e.payload?.scoreData?.time_survived === snap.stats.time && e.payload?.scoreData?.kills === snap.stats.kills && e.payload?.scoreData?.arena_id === snap.stats.arenaId);
        if (dup) return;
        queue.push({ payload: statsToPayload(snap.stats, user), queuedAt: snap.takenAt || Date.now(), reason: 'cloud_checkpoint' });
        while (queue.length > 20) queue.shift();
        localStorage.setItem('pending_score_saves', JSON.stringify(queue));
        console.log('[flushPendingScores] Promoted cloud checkpoint (cross-device recovery).');
    } catch (e) {
        console.warn('[flushPendingScores] Cloud snapshot promotion failed:', e?.message);
    }
}

export async function flushPendingScores() {
    if (flushing) return;
    flushing = true;
    try {
        // First pass: pull any orphan snapshots (local + cloud) into the queue.
        promoteOrphanSnapshot();
        await promoteCloudSnapshot();

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