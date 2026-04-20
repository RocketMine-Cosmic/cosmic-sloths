import { OmenXGameSDK } from '@omen.foundation/game-sdk';

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
      localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'omenx_auth_data',
        newValue: JSON.stringify(authData),
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
    console.error('[OmenX] init failed', err);
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