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
            // Validate required fields exist before accepting
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