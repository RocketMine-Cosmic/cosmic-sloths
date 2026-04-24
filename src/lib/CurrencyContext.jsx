import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribePlayerData, fetchPlayerData } from '@/lib/playerDataCache';
import { SaveManager } from '@/game/SaveManager';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [save, setSave] = useState(SaveManager.load());
  const [omenxBalance, setOmenxBalance] = useState(null);
  const [vipLevel, setVipLevel] = useState(0);
  const [omenxUser, setOmenxUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribePlayerData((data) => {
      if (data) {
        setOmenxBalance(data.balance ?? null);
        setVipLevel(data.vipLevel ?? 0);
        // Extract user info from player data if available
        if (data.user) {
          setOmenxUser(data.user);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleSaveUpdated = (e) => setSave(e.detail);
    window.addEventListener('saveUpdated', handleSaveUpdated);
    return () => window.removeEventListener('saveUpdated', handleSaveUpdated);
  }, []);

  useEffect(() => {
    const handleOmenXUserUpdated = (e) => {
      const updatedUser = {
        walletAddress: e.detail.walletAddress,
        username: e.detail.username,
        full_name: e.detail.player_name || e.detail.username || 'Player',
        player_name: e.detail.player_name || e.detail.username || 'Player',
        pilot_icon: e.detail.pilot_icon || '🦥',
        data: {
          player_name: e.detail.player_name || e.detail.username || 'Player',
          player_title: e.detail.player_title || '',
          pilot_icon: e.detail.pilot_icon || '🦥',
        }
      };
      setOmenxUser(updatedUser);
    };
    window.addEventListener('omenxUserUpdated', handleOmenXUserUpdated);
    return () => window.removeEventListener('omenxUserUpdated', handleOmenXUserUpdated);
  }, []);

  return (
    <CurrencyContext.Provider value={{ save, omenxBalance, loading, refresh: () => fetchPlayerData(true), vipLevel, omenxUser }}>
      {children}
    </CurrencyContext.Provider>
  );

  // User is now fetched by playerDataCache and merged into omenxUser via subscribePlayerData
  // No additional /v1/oauth/user calls needed — all components share cached data
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

export const useOmenXUserFromCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useOmenXUserFromCurrency must be used within CurrencyProvider');
  }
  // Return just the user-related data
  return {
    user: context.omenxUser,
    loading: context.loading,
  };
};

export const useOmenXVipFromCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useOmenXVipFromCurrency must be used within CurrencyProvider');
  }
  // Return just the VIP-related data
  return {
    vip: context.vipLevel,
    loading: context.loading,
  };
};