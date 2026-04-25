import { OmenXGameSDK } from '@omen.foundation/game-sdk';

const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

export const omenx = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  enableIframeAuth: false, // Standalone game, not embedded
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
let initPromise = null;

export const initOmenX = async () => {
  if (sdkReady) return Promise.resolve();
  
  // Prevent multiple concurrent init attempts
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('[OmenX] Initializing SDK...');
      await omenx.init();
      console.log('[OmenX] SDK initialized successfully');
      sdkReady = true;
    } catch (err) {
      console.error('[OmenX] SDK init failed:', err);
      sdkReady = false;
      initPromise = null;
      throw err;
    }
  })();
  
  return initPromise;
};

export const waitForSdkReady = async () => {
  await initOmenX();
};