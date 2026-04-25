// OmenX SDK Client Initialization
let OmenXGameSDK = null;

async function loadSDK() {
  if (OmenXGameSDK) return OmenXGameSDK;
  try {
    const mod = await import('@omen.foundation/game-sdk');
    OmenXGameSDK = mod.OmenXGameSDK;
    return OmenXGameSDK;
  } catch (err) {
    console.error('[OmenX SDK] Failed to load SDK module:', err);
    throw err;
  }
}

let sdkInstance = null;

const GAME_ID = 'cosmic-sloths';
const REDIRECT_URI = (() => {
  if (typeof window === 'undefined') return '';
  if (window.location.hostname === 'cosmic-sloths.com') {
    return 'https://cosmic-sloths.com/auth/callback';
  }
  return `${window.location.origin}/auth/callback`;
})();

export async function initializeSDK() {
  if (sdkInstance) return sdkInstance;

  try {
    const SDK = await loadSDK();
    
    console.log('[OmenX SDK] Initializing with GAME_ID:', GAME_ID);
    console.log('[OmenX SDK] Redirect URI:', REDIRECT_URI);

    sdkInstance = new SDK({
      gameId: GAME_ID,
      onAuth: (authData) => {
        console.log('[OmenX SDK] ✓ Authenticated:', authData.walletAddress);
        localStorage.setItem('omenx_auth_data', JSON.stringify({
          accessToken: authData.accessToken,
          walletAddress: authData.walletAddress,
          userId: authData.userId,
          expiresAt: authData.expiresAt || Date.now() + 3600000,
        }));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'omenx_auth_data',
          newValue: localStorage.getItem('omenx_auth_data'),
          storageArea: localStorage,
        }));
      },
      onAuthError: (error) => {
        console.error('[OmenX SDK] Auth error:', error);
      },
    });

    await sdkInstance.init();
    console.log('[OmenX SDK] ✓ SDK initialized');
    return sdkInstance;
  } catch (err) {
    console.error('[OmenX SDK] Init failed:', err);
    sdkInstance = null;
    throw err;
  }
}

export async function authenticateUser() {
  if (!sdkInstance) {
    await initializeSDK();
  }

  console.log('[OmenX SDK] Starting authentication...');
  try {
    await sdkInstance.authenticate({
      redirectUri: REDIRECT_URI,
      enablePKCE: true,
    });
    console.log('[OmenX SDK] ✓ Authentication flow completed');
  } catch (err) {
    console.error('[OmenX SDK] Authentication failed:', err);
    throw err;
  }
}

export function getSDK() {
  return sdkInstance;
}

export function logout() {
  localStorage.removeItem('omenx_auth_data');
  console.log('[OmenX SDK] Logged out');
}