import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribePlayerData, fetchPlayerData } from '@/lib/playerDataCache';
import { SaveManager } from '@/game/SaveManager';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [save, setSave] = useState(SaveManager.load());
  const [omenxBalance, setOmenxBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribePlayerData((data) => {
      setOmenxBalance(data?.balance ?? null);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleSaveUpdated = (e) => setSave(e.detail);
    window.addEventListener('saveUpdated', handleSaveUpdated);
    return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
  }, []);

  return (
    <CurrencyContext.Provider value={{ save, omenxBalance, loading, refresh: () => fetchPlayerData(true) }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};