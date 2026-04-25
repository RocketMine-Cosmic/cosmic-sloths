// Manual OAuth2 flow with PKCE (no SDK)

const API_BASE = 'https://api.omen.foundation';
const GAME_ID = 'cosmic-sloths';

// Get redirect URI (cached on preview to stay consistent across refreshes)
const REDIRECT_URI = (() => {
  if (typeof window === 'undefined') return '';
  if (window.location.hostname === 'cosmic-sloths.com') {
    return 'https://cosmic-sloths.com/auth/callback';
  }
  try {
    const cached = localStorage.getItem('omenx_redirect_uri');
    if (cached) return cached;
    const uri = `${window.location.origin}/auth/callback`;
    localStorage.setItem('omenx_redirect_uri', uri);
    return uri;
  } catch {
    return `${window.location.origin}/auth/callback`;
  }
})();

// PKCE helpers
function generateRandomString(length = 43) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return hashBase64;
}

// OAuth flow
export async function startOmenXAuth() {
  console.log('[OmenX] Starting OAuth flow...');
  
  try {
    // Generate PKCE
    const codeVerifier = generateRandomString();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(32);
    
    // Store for callback handler
    sessionStorage.setItem('omenx_code_verifier', codeVerifier);
    sessionStorage.setItem('omenx_state', state);
    
    // Build authorize URL
    const params = new URLSearchParams({
      client_id: GAME_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    
    const authorizeUrl = `${API_BASE}/v1/oauth/authorize?${params.toString()}`;
    console.log('[OmenX] Opening authorize URL:', authorizeUrl);
    
    // Open popup
    const popup = window.open(authorizeUrl, '_blank', 'width=500,height=600');
    if (!popup) {
      throw new Error('Popup blocked');
    }
    
    // Poll for popup close (callback will be handled by AuthCallback component)
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          // Check if auth succeeded (callback writes to localStorage)
          setTimeout(() => {
            const authData = (() => {
              try {
                return JSON.parse(localStorage.getItem('omenx_auth_data'));
              } catch {
                return null;
              }
            })();
            
            if (authData?.accessToken) {
              console.log('[OmenX] ✓ Auth succeeded');
              resolve(authData);
            } else {
              reject(new Error('Authorization cancelled or failed'));
            }
          }, 500);
        }
      }, 500);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!popup.closed) popup.close();
        reject(new Error('Authorization timeout'));
      }, 5 * 60 * 1000);
    });
  } catch (err) {
    console.error('[OmenX] Auth failed:', err.message);
    throw err;
  }
}

export async function exchangeCodeForToken(code, state) {
  console.log('[OmenX] Exchanging code for token...');
  
  try {
    const codeVerifier = sessionStorage.getItem('omenx_code_verifier');
    const savedState = sessionStorage.getItem('omenx_state');
    
    if (!codeVerifier) throw new Error('No code verifier found');
    if (state !== savedState) throw new Error('State mismatch');
    
    const response = await fetch(`${API_BASE}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error_description || 'Token exchange failed');
    }
    
    const { access_token, refresh_token } = await response.json();
    console.log('[OmenX] ✓ Got access token');
    
    // Fetch user info
    const userRes = await fetch(`${API_BASE}/v1/oauth/user`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    if (!userRes.ok) throw new Error('Failed to fetch user info');
    
    const userInfo = await userRes.json();
    console.log('[OmenX] ✓ Got user info:', userInfo.wallet_address);
    
    // Save auth data
    const authData = {
      accessToken: access_token,
      refreshToken: refresh_token,
      walletAddress: userInfo.wallet_address,
      username: userInfo.username || '',
      expiresAt: Date.now() + 3600000, // 1 hour
    };
    
    localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
    
    // Cleanup
    sessionStorage.removeItem('omenx_code_verifier');
    sessionStorage.removeItem('omenx_state');
    
    // Dispatch event for listeners
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'omenx_auth_data',
        newValue: JSON.stringify(authData),
        storageArea: localStorage,
      }));
    } catch (e) {}
    
    return authData;
  } catch (err) {
    console.error('[OmenX] Token exchange failed:', err.message);
    throw err;
  }
}

export async function logout() {
  console.log('[OmenX] Logging out...');
  try {
    localStorage.removeItem('omenx_auth_data');
    console.log('[OmenX] ✓ Logged out');
  } catch (e) {
    console.error('[OmenX] Logout failed:', e);
  }
}

// Stub for compatibility
export const omenx = {
  init: async () => {
    console.log('[OmenX] Init (manual OAuth mode)');
  },
  authenticate: startOmenXAuth,
  logout,
};

export const initOmenX = async () => {
  console.log('[OmenX] Initializing...');
  console.log('[OmenX] Using Redirect URI:', REDIRECT_URI);
};

export const waitForSdkReady = async () => {
  // No-op in manual mode
};