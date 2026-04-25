import { OmenXGameSDK } from '@omen.foundation/game-sdk';

// Redirect URI MUST match portal registration (exact string)
const REDIRECT_URI = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;

export const omenx = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  apiBaseUrl: 'https://api.omen.foundation',
  oauthAuthorizeUrl: 'https://api.omen.foundation/v1/oauth/authorize',
  oauthTokenUrl: 'https://api.omen.foundation/v1/oauth/token',
  enableIframeAuth: false, // Standalone Base44 game, not embedded
  onAuth: (authData) => {
    console.log('[OmenX] ✓ onAuth callback:', authData.walletAddress);
    try {
      localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'omenx_auth_data',
        newValue: JSON.stringify(authData),
        storageArea: localStorage,
      }));
    } catch (e) {
      console.error('[OmenX] localStorage failed:', e);
    }
  },
  onAuthError: (err) => {
    console.error('[OmenX] ❌ Auth error:', err.message || err);
  },
  onLogout: () => {
    console.log('[OmenX] Logout');
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
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('[OmenX] Initializing...');
      await omenx.init();
      sdkReady = true;
      console.log('[OmenX] ✓ Initialized');
    } catch (err) {
      console.error('[OmenX] Init failed:', err);
      sdkReady = false;
      initPromise = null;
      throw err;
    }
  })();
  
  return initPromise;
};

export const startOmenXAuth = async () => {
  await initOmenX();
  console.log('[OmenX] Starting OAuth flow');
  console.log('[OmenX] Redirect URI:', REDIRECT_URI);
  console.log('[OmenX] Game ID: cosmic-sloths');
  
  try {
    await omenx.authenticate({
      redirectUri: REDIRECT_URI,
      enablePKCE: true,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('[OmenX] Auth failed:', msg);
    
    if (msg.includes('CORS') || msg.includes('Failed to fetch')) {
      console.error('[OmenX] CORS/Network issue — verify redirect URI is registered in OMENX Developer Portal');
    }
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      console.error('[OmenX] Auth 401 — check game ID and credentials');
    }
    throw err;
  }
};

export const waitForSdkReady = async () => {
  await initOmenX();
};