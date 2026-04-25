import React, { createContext, useContext, useEffect, useState } from 'react';

const OmenXAuthContext = createContext();

export const OmenXAuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage once
    try {
      const stored = localStorage.getItem('omenx_auth_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate required fields exist
        if (parsed?.walletAddress) setAuthData(parsed);
      }
    } catch {}
    setLoading(false);

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

    // Listen for postMessage from OAuth popup (same tab — storage event doesn't fire)
    const onMessage = (event) => {
      const { type, authData: msgAuthData } = event.data || {};
      if ((type === 'omenx_auth' || type === 'omenx_auth_response') && msgAuthData?.walletAddress && msgAuthData?.accessToken) {
        setAuthData(msgAuthData);
      }
    };

    // Poll localStorage for changes (handles cases where postMessage is missed or timing issues)
    const pollInterval = setInterval(() => {
      try {
        const stored = localStorage.getItem('omenx_auth_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.walletAddress && (!authData || authData.walletAddress !== parsed.walletAddress)) {
            setAuthData(parsed);
          }
        }
      } catch {}
    }, 500);

    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
      clearInterval(pollInterval);
    };
  }, [authData]);

  return (
    <OmenXAuthContext.Provider value={{ authData, loading }}>
      {children}
    </OmenXAuthContext.Provider>
  );
};

export const useOmenXAuth = () => {
  const context = useContext(OmenXAuthContext);
  if (!context) throw new Error('useOmenXAuth must be used within OmenXAuthProvider');
  return context;
};