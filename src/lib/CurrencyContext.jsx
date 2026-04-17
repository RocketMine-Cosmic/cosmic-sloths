import React, { createContext, useContext, useEffect, useState } from 'react';
import { useOmenXBalance } from '@/hooks/useOmenXBalance';
import { SaveManager } from '@/game/SaveManager';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [save, setSave] = useState(SaveManager.load());
  const { balance: omenxBalance, loading } = useOmenXBalance();

  useEffect(() => {
    const handleSaveUpdated = (e) => setSave(e.detail);
    window.addEventListener('saveUpdated', handleSaveUpdated);
    return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
  }, []);

  return (
    <CurrencyContext.Provider value={{ save, omenxBalance, loading }}>
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