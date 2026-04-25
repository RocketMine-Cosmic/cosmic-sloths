import { useLayoutEffect } from 'react';

export default function AuthCallback() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (!code || !state) {
      console.error('[AuthCallback] Missing code or state');
      window.close();
      return;
    }

    try {
      const storageKey = `omenx_oauth_callback_${state}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({ code, state, timestamp: Date.now() }),
      );
      console.log('[AuthCallback] Wrote OAuth callback to localStorage:', storageKey);
    } catch (e) {
      console.error('[AuthCallback] localStorage failed:', e);
      window.close();
      return;
    }

    // Close popup after short delay to ensure storage flush
    setTimeout(() => {
      try {
        window.close();
      } catch {
        /* ignore */
      }
    }, 150);
  }, []);

  return null;
}