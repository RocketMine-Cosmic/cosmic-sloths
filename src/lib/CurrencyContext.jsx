import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribePlayerData, fetchPlayerData } from '@/lib/playerDataCache';
import { SaveManager } from '@/game/SaveManager';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [save, setSave] = useState(SaveManager.load());
  const [omenxBalance, setOmenxBalance] = useState(null);
  const [vipLevel, setVipLevel] = useState(0);
  const [nfts, setNfts] = useState([]);
  const [omenxUser, setOmenxUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribePlayerData((data) => {
      if (data) {
        setOmenxBalance(data.balance ?? null);
        setVipLevel(data.vipLevel ?? 0);
        setNfts(data.nfts ?? []);
        if (data.user) setOmenxUser(data.user);
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

  // Local profile edits (title, name, icon) are written via updateOmenXUser to
  // localStorage/IndexedDB and emit `omenxUserUpdated`. The playerDataCache only
  // refreshes from the API so we merge those local fields into omenxUser here
  // so equipped titles etc. show up immediately across pages.
  useEffect(() => {
    const handleUserUpdated = (e) => {
      const updates = e.detail || {};
      setOmenxUser(prev => {
        // If omenxUser hasn't loaded yet, build a minimal record from the
        // update payload so the title (or whatever changed) isn't lost.
        const base = prev || {
          walletAddress: updates.walletAddress,
          username: updates.username || '',
          full_name: updates.player_name || updates.username || 'Player',
          player_name: updates.player_name || updates.username || 'Player',
          pilot_icon: updates.pilot_icon || '🦥',
          data: {},
        };
        return {
          ...base,
          player_name: updates.player_name ?? base.player_name,
          pilot_icon: updates.pilot_icon ?? base.pilot_icon,
          data: {
            ...(base.data || {}),
            player_name: updates.player_name ?? base.data?.player_name,
            player_title: updates.player_title !== undefined ? updates.player_title : base.data?.player_title,
            pilot_icon: updates.pilot_icon ?? base.data?.pilot_icon,
          },
        };
      });
    };
    window.addEventListener('omenxUserUpdated', handleUserUpdated);
    return () => window.removeEventListener('omenxUserUpdated', handleUserUpdated);
  }, []);

  return (
    <CurrencyContext.Provider value={{ save, omenxBalance, loading, refresh: () => fetchPlayerData(true), vipLevel, nfts, omenxUser }}>
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