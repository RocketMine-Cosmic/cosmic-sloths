import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Tiny hook — fetches the global "OMENX purchases disabled" flag and re-polls
// while mounted. Used by every OMENX-spending surface (Hub, Upgrades, Loadouts,
// in-run modals) so buttons can show a disabled state up-front instead of
// relying on the OmenXConfirmation modal / server 503 to surface the block.
//
// IMPORTANT — resilience to 429s:
//   getMaintenanceMode is one of the most rate-limited functions on the platform
//   (every player polls it every 15s). When it gets 429'd, we used to swallow
//   the error and leave `disabled` at false → players could still click OMENX
//   buttons while the kill-switch was actually on. Two fixes:
//   1. Persist the latest known flag to localStorage so a successful "disabled"
//      response survives subsequent 429 storms (and survives page reloads).
//   2. Retry on 429 with exponential backoff before giving up.
const LS_KEY = 'omenx_purchases_disabled_cache';
const STALE_AFTER_MS = 10 * 60 * 1000; // 10 min — if cache hasn't been refreshed, ignore

function readCache() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.disabled !== 'boolean') return null;
        if (Date.now() - (parsed.at || 0) > STALE_AFTER_MS) return null;
        return parsed;
    } catch { return null; }
}
function writeCache(disabled, message) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({ disabled, message: message || '', at: Date.now() }));
    } catch {}
}

async function fetchWithRetry() {
    const delays = [400, 900, 1800];
    let lastErr = null;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
            const res = await base44.functions.invoke('getMaintenanceMode', {});
            return res.data;
        } catch (err) {
            lastErr = err;
            const status = err?.response?.status || err?.status;
            const msg = String(err?.message || '').toLowerCase();
            const isTransient = status === 429 || status === 502 || status === 503 || status === 504 || msg.includes('rate limit');
            if (!isTransient || attempt === delays.length) throw err;
            await new Promise(r => setTimeout(r, delays[attempt]));
        }
    }
    throw lastErr;
}

export function useOmenXPurchasesDisabled() {
    // Initialize from persisted cache so a fresh mount during a 429 storm still
    // reflects the last known "disabled" state instead of defaulting to enabled.
    const cached = readCache();
    const [disabled, setDisabled] = useState(cached?.disabled || false);
    const [message, setMessage] = useState(cached?.message || '');

    useEffect(() => {
        let cancelled = false;
        const fetchOnce = async () => {
            try {
                const data = await fetchWithRetry();
                if (cancelled) return;
                const next = !!data?.omenxPurchasesDisabled;
                const nextMsg = data?.omenxPurchasesMessage || '';
                setDisabled(next);
                setMessage(nextMsg);
                writeCache(next, nextMsg);
            } catch {
                // All retries failed — DO NOT clear `disabled`. Keep the last
                // known state so a rate-limited refresh doesn't accidentally
                // re-enable buttons while the kill-switch is genuinely on.
            }
        };
        fetchOnce();
        // Poll every 30s — long enough to avoid contributing to 429 storms,
        // short enough that admins flipping the kill-switch see effect within
        // ~30s (plus retry backoff). The persisted cache covers any gaps.
        const t = setInterval(fetchOnce, 30_000);
        return () => { cancelled = true; clearInterval(t); };
    }, []);

    return { disabled, message };
}