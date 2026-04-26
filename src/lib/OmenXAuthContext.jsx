import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const OmenXAuthContext = createContext();

// Shared Base44 auth check — runs ONCE app-wide and is consumed by every gate/button.
// Re-checks only on tab focus regain. Eliminates the burst of `me` calls that
// happened when 13 carousel slides each ran their own auth check.
export const OmenXAuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [base44Authed, setBase44Authed] = useState(null); // null = checking

  useEffect(() => {
    // Load OmenX auth from localStorage first (instant, no flicker)
    let foundInLocal = false;
    try {
      const stored = localStorage.getItem('omenx_auth_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.walletAddress) {
          setAuthData(parsed);
          foundInLocal = true;
        }
      }
    } catch {}
    setLoading(false);

    // Fall back to IndexedDB if localStorage was cleared but IDB still has auth
    // (browsers sometimes clear localStorage independently). Without this, the
    // "Connect Wallet" button shows even though the user is already authenticated.
    if (!foundInLocal) {
      (async () => {
        try {
          const { getAuthFromIndexedDB } = await import('@/lib/indexedDbAuth');
          const idbAuth = await getAuthFromIndexedDB();
          if (idbAuth?.walletAddress) {
            // Mirror back to localStorage so other code finds it instantly next time
            try { localStorage.setItem('omenx_auth_data', JSON.stringify(idbAuth)); } catch {}
            setAuthData(idbAuth);
          }
        } catch {}
      })();
    }

    // Listen for storage changes (login/logout in other tabs)
    const onStorage = (e) => {
      if (e.key === 'omenx_auth_data' && e.storageArea === localStorage) {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (parsed?.walletAddress) setAuthData(parsed);
            else setAuthData(null);
          } else {
            setAuthData(null);
          }
        } catch {
          setAuthData(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Single shared Base44 auth check (was being run independently by every gate/button).
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const isAuthed = await base44.auth.isAuthenticated();
        if (!cancelled) setBase44Authed(!!isAuthed);
      } catch {
        if (!cancelled) setBase44Authed(false);
      }
    };
    check();
    const onFocus = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onFocus); };
  }, []);

  return (
    <OmenXAuthContext.Provider value={{ authData, loading, base44Authed }}>
      {children}
    </OmenXAuthContext.Provider>
  );
};

export const useOmenXAuth = () => {
  const context = useContext(OmenXAuthContext);
  if (!context) throw new Error('useOmenXAuth must be used within OmenXAuthProvider');
  return context;
};