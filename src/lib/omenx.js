import { OmenXGameSDK } from '@omen.foundation/game-sdk';

const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';

export const omenx = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  apiBaseUrl: 'https://api.omen.foundation',
  oauthAuthorizeUrl: 'https://api.omen.foundation/v1/oauth/authorize',
  oauthTokenUrl: 'https://api.omen.foundation/v1/oauth/token',
  enableIframeAuth: false, // Base44 is standalone, not embedded
  onAuth: (authData) => {
    console.log('[OmenX] Authenticated', authData);
    // Store in sessionStorage for app access
    try {
      sessionStorage.setItem('omenx_auth_data', JSON.stringify(authData));
      // Trigger storage event for listeners (e.g., OmenXAuthButton)
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'omenx_auth_data',
        newValue: JSON.stringify(authData),
        storageArea: sessionStorage,
      }));
    } catch (e) {
      console.error('[OmenX] Failed to store auth data', e);
    }
  },
  onAuthError: (err) => {
    console.error('[OmenX] Auth error', err);
  },
  onLogout: () => {
    console.log('[OmenX] Logged out');
    try {
      sessionStorage.removeItem('omenx_auth_data');
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
};

export const getRedirectUri = () => REDIRECT_URI;