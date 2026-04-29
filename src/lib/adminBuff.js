// Admin perk: tiny +2% boost to all base stats while playing.
// Client-side only — admins are trusted. Cached per-session so we don't
// hammer the admin endpoint on every run.
//
// Save shape: save.adminBuff = { mult: 0.02 } (or null when not an admin).

import { base44 } from '@/api/base44Client';

const ADMIN_BUFF_MULT = 0.02; // 2% to all base stats
const SESSION_KEY = 'cosmic_sloth_is_admin_v1'; // sessionStorage cache

let inflight = null;

async function checkIsAdmin() {
    // Try cached value first (per browser session).
    try {
        const cached = sessionStorage.getItem(SESSION_KEY);
        if (cached !== null) return cached === '1';
    } catch { /* ignore */ }

    if (inflight) return inflight;
    inflight = base44.functions.invoke('getAdminData', { type: 'adminWallets' })
        .then(res => {
            const ok = !res?.data?.error;
            try { sessionStorage.setItem(SESSION_KEY, ok ? '1' : '0'); } catch { /* ignore */ }
            return ok;
        })
        .catch(() => {
            try { sessionStorage.setItem(SESSION_KEY, '0'); } catch { /* ignore */ }
            return false;
        })
        .finally(() => { inflight = null; });
    return inflight;
}

// Returns the buff object to attach to save.adminBuff (or null).
export async function getAdminBuff() {
    const isAdmin = await checkIsAdmin();
    return isAdmin ? { mult: ADMIN_BUFF_MULT } : null;
}