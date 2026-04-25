import { useLayoutEffect } from 'react';

export default function AuthCallback() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    // Prevent automatic closing
    const originalClose = window.close;
    window.close = () => {
      console.log('[AuthCallback] window.close() called but prevented for debugging');
    };

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    console.log('[AuthCallback] Received:', { code: code?.slice(0, 20), state: state?.slice(0, 20) });
    
    if (!code || !state) {
      console.error('[AuthCallback] Missing code or state');
      return;
    }

    try {
      // Signal opener that callback was received
      if (window.opener) {
        window.opener.postMessage({
          type: 'omenx_oauth_callback',
          code,
          state,
        }, window.location.origin);
        console.log('[AuthCallback] Sent postMessage to opener');
      }
    } catch (e) {
      console.error('[AuthCallback] postMessage failed:', e);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm">Completing authentication...</p>
      </div>
    </div>
  );
}