import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import OmenXAuthButton from './game/OmenXAuthButton';
import SpaceBackground from './game/SpaceBackground';
import { getAuthFromIndexedDB } from '@/lib/indexedDbAuth';

export default function AuthGate({ children }) {
  const [ready, setReady] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const debounceRef = React.useRef(null);

  useEffect(() => {
    checkAuth();
    
    // Re-check when OmenX wallet is synced to Base44
    const handleWalletSynced = () => {
      checkAuth();
    };
    
    // Re-check when OAuth callback popup closes
    const handleMessage = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'omenx_oauth_callback') {
        console.log('[AuthGate] OAuth callback popup closed, rechecking auth...');
        setTimeout(() => checkAuth(), 100);
      }
    };
    
    window.addEventListener('omenx_wallet_synced', handleWalletSynced);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('omenx_wallet_synced', handleWalletSynced);
      window.removeEventListener('message', handleMessage);
      clearTimeout(debounceRef.current);
    };
  }, []);

  const checkAuth = async () => {
    try {
      // Check localStorage first, then IndexedDB for OmenX wallet
      let omenxAuth = JSON.parse(localStorage.getItem('omenx_auth_data') || '{}');
      
      if (!omenxAuth?.walletAddress) {
        // Fall back to IndexedDB
        const dbAuth = await getAuthFromIndexedDB();
        if (dbAuth?.walletAddress) {
          omenxAuth = dbAuth;
          localStorage.setItem('omenx_auth_data', JSON.stringify(dbAuth));
          console.log('[AuthGate] Restored OmenX from IndexedDB');
        }
      }
      
      if (omenxAuth?.walletAddress) {
        // OmenX is authenticated—allow play immediately (Base44 optional)
        console.log('[AuthGate] OmenX wallet linked, allowing access');
        setHasWallet(true);
        setReady(true);
        
        // Try to sync to Base44 in background if authenticated
        try {
          const isBase44Auth = await base44.auth.isAuthenticated();
          if (isBase44Auth) {
            const user = await base44.auth.me();
            if (!user?.data?.omenx_wallet) {
              await base44.functions.invoke('syncOmenXWallet', { 
                walletAddress: omenxAuth.walletAddress,
                refreshToken: omenxAuth.refreshToken || null
              });
              console.log('[AuthGate] Synced OmenX wallet to Base44');
            }
          }
        } catch (e) {
          // Base44 sync is optional—OmenX-only users can still play
          console.log('[AuthGate] Base44 sync skipped (optional):', e.message);
        }
        return;
      }
      
      // No OmenX wallet yet - show link wallet screen
      console.log('[AuthGate] No OmenX wallet linked');
      setHasWallet(false);
      setReady(true);
    } catch (err) {
      console.error('[AuthGate] Check failed:', err);
      setReady(true);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!hasWallet) {
    return (
      <div className="min-h-screen relative text-slate-200 flex items-center justify-center font-sans">
        <SpaceBackground />
        <div className="relative z-10 bg-[#0b0416]/95 border border-cyan-500/50 rounded-2xl p-8 md:p-12 max-w-md w-full mx-4 shadow-2xl text-center">
          <h1 className="text-3xl font-black uppercase tracking-widest mb-2" style={{ color: '#06b6d4', textShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
            Link Your Wallet
          </h1>
          <p className="text-slate-400 text-base mb-6">Connect your OmenX wallet to play Cosmic Sloths.</p>
          <OmenXAuthButton onSuccess={() => { setHasWallet(true); checkAuth(); }} fullWidth />
        </div>
      </div>
    );
  }

  return children;
}