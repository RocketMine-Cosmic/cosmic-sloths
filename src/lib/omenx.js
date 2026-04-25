import { OmenXGameSDK } from '@omen.foundation/game-sdk';
import { base44 } from '@/api/base44Client';

const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

export const omenx = new OmenXGameSDK({
  gameId: 'cosmic-sloths',
  apiBaseUrl: 'https://api.omen.foundation',
  oauthAuthorizeUrl: 'https://api.omen.foundation/v1/oauth/authorize',
  enableIframeAuth: true,
  onAuth: async (authData) => {
    console.log('[OmenX] ✓ onAuth triggered with:', authData);
    try {
      localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
      
      // Sync wallet to Base44 user entity
      if (authData?.walletAddress) {
        try {
          await base44.auth.updateMe({
            omenx_wallet: authData.walletAddress
          });
          console.log('[OmenX] ✓ Wallet synced to Base44');
        } catch (syncErr) {
          console.warn('[OmenX] Wallet sync to Base44 failed:', syncErr.message);
        }
      }
      
      // Trigger AuthGate re-check
      window.dispatchEvent(new CustomEvent('omenx_wallet_synced'));
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