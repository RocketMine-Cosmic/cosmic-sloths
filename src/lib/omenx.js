import { OmenXGameSDK } from '@omen.foundation/game-sdk';
import { stampAuthWeek } from '@/lib/omenxSessionWeek';

const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

export const omenx = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  apiBaseUrl: 'https://api.omen.foundation',
  oauthAuthorizeUrl: 'https://api.omen.foundation/v1/oauth/authorize',
  enableIframeAuth: true,
  onAuth: (authData) => {
    console.log('[OmenX] ✓ onAuth triggered with:', authData);
    try {
      // Merge — preserve user's profile customizations across re-auth.
      // The OAuth payload doesn't include player_title / pilot_icon / player_name,
      // so a naive overwrite wipes the equipped title every time auth refreshes,
      // making titles appear "stuck" reverting to blank/old values.
      let preserved = {};
      try {
        const existing = JSON.parse(localStorage.getItem('omenx_auth_data') || '{}');
        if (existing && typeof existing === 'object') {
          if (existing.player_title !== undefined) preserved.player_title = existing.player_title;
          if (existing.pilot_icon !== undefined) preserved.pilot_icon = existing.pilot_icon;
          if (existing.player_name !== undefined) preserved.player_name = existing.player_name;
        }
      } catch {}
      // Stamp the ISO week this token was minted in — enforceWeeklyOmenSession
      // uses it to force a fresh OAuth (= recorded Omen session) each rollover.
      const merged = stampAuthWeek({ ...authData, ...preserved });
      localStorage.setItem('omenx_auth_data', JSON.stringify(merged));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'omenx_auth_data',
        newValue: JSON.stringify(merged),
        storageArea: localStorage,
      }));
    } catch (e) {
      console.error('[OmenX] Failed to store auth data', e);
    }
  },
  onAuthError: (err) => {
    console.error('[OmenX] ❌ onAuthError triggered:', {
      message: err.message,
      code: err.code,
      status: err.status,
      fullError: err,
    });
  },
  onLogout: () => {
    console.log('[OmenX] Logged out');
    try {
      localStorage.removeItem('omenx_auth_data');
    } catch (e) {
      console.error('[OmenX] Failed to clear auth data', e);
    }
  },
});

export const initOmenX = async () => {
  try {
    await omenx.init();
  } catch (err) {
    // Silently fail - expected in some environments
  }

  // If embedded in an iframe (e.g. Omen website), request auth token from parent
  if (window.self !== window.top) {
    try {
      window.parent.postMessage({ type: 'omenx_request_auth', gameId: 'cosmic-sloths' }, '*');
      console.log('[OmenX] Requested auth from parent iframe');
    } catch (e) {
      console.error('[OmenX] Failed to request auth from parent', e);
    }
  }
};

export const getRedirectUri = () => `${getBaseUrl()}/auth/callback`;