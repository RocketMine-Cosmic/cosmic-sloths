import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    // OAuth redirect lands here with auth data in URL params or from SDK
    // Close the popup window to return control to parent
    window.close();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
}