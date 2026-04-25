import { OmenXGameSDK } from '@omen.foundation/game-sdk';

const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

export const omenx = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  enableIframeAuth: true, // Auto-auth when embedded in OmenX frontend
  parentOrigin: 'https://omen.foundation',
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

let sdkReady = false;

export const initOmenX = async () => {
  if (sdkReady) return Promise.resolve();
  
  try {
    console.log('[OmenX] Initializing SDK...');
    await omenx.init();
    console.log('[OmenX] SDK initialized successfully');
    sdkReady = true;
  } catch (err) {
    console.error('[OmenX] SDK init failed:', err);
    throw err;
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

export const waitForSdkReady = async () => {
  let attempts = 0;
  while (!sdkReady && attempts < 50) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
  if (!sdkReady) throw new Error('SDK failed to initialize');
};