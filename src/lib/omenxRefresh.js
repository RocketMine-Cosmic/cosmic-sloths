// Periodically refreshes the OmenX access token using the stored refresh token.
// OmenX tokens last ~1hr; we refresh every 50 minutes while the user is active.

import { omenx } from '@/lib/omenx';

const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 min
let refreshTimer = null;

async function refreshOnce() {
    try {
        const stored = localStorage.getItem('omenx_auth_data');
        if (!stored) return;
        const auth = JSON.parse(stored);
        if (!auth?.refreshToken) return;

        // Try the SDK's refresh method (name may vary across SDK versions)
        const fn = omenx.refreshToken || omenx.refreshAccessToken || omenx.refresh;
        if (typeof fn !== 'function') {
            console.warn('[omenxRefresh] SDK has no refresh method — skipping');
            return;
        }
        const result = await fn.call(omenx, auth.refreshToken);
        if (!result?.accessToken) {
            console.warn('[omenxRefresh] No accessToken in refresh response');
            return;
        }

        const updated = {
            ...auth,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken || auth.refreshToken,
            expiresIn: result.expiresIn || auth.expiresIn,
        };
        localStorage.setItem('omenx_auth_data', JSON.stringify(updated));
        console.log('[omenxRefresh] ✓ Token refreshed');
    } catch (e) {
        console.warn('[omenxRefresh] Refresh failed:', e.message);
    }
}

export function startOmenXRefresh() {
    if (refreshTimer) return;
    // Run once on start (catches stale tokens from prior sessions), then every 50 min
    refreshOnce();
    refreshTimer = setInterval(refreshOnce, REFRESH_INTERVAL_MS);
}

export function stopOmenXRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}