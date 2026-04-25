import { useLayoutEffect } from 'react';

export default function AuthCallback() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    
    console.log('[AuthCallback] Received from OMENX redirect:', { code: !!code, state: !!state, error, errorDesc });
    
    if (error) {
      console.error('[AuthCallback] ❌ OAuth Error:', error, errorDesc);
      return;
    }

    if (!code || !state) {
      console.error('[AuthCallback] Missing code or state');
      return;
    }

    try {
      // Write to localStorage so SDK opener can pick it up
      // Key format: omenx_oauth_callback_${state}
      const storageKey = `omenx_oauth_callback_${state}`;
      const payload = {
        code,
        state,
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      console.log('[AuthCallback] ✓ Stored callback in localStorage, closing popup in 2s');
    } catch (e) {
      console.error('[AuthCallback] localStorage failed:', e);
      return;
    }

    // Close popup after storage flush
    setTimeout(() => {
      try {
        window.close();
      } catch (e) {
        console.error('[AuthCallback] Could not close window:', e);
      }
    }, 2000);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}