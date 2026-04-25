import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import OmenXAuthButton from './game/OmenXAuthButton';
import SpaceBackground from './game/SpaceBackground';

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
    window.addEventListener('omenx_wallet_synced', handleWalletSynced);
    return () => {
      window.removeEventListener('omenx_wallet_synced', handleWalletSynced);
      clearTimeout(debounceRef.current);
    };
  }, []);

  const checkAuth = async () => {
    try {
      // Check if OmenX wallet is already in localStorage (user logged in with OmenX)
      const omenxAuth = JSON.parse(localStorage.getItem('omenx_auth_data') || '{}');
      if (omenxAuth?.walletAddress) {
        // OmenX is authenticated, now enforce Base44 login (required for saves)
        try {
          const isBase44Auth = await base44.auth.isAuthenticated();
          if (!isBase44Auth) {
            console.log('[AuthGate] OmenX ready but Base44 not authenticated, redirecting to login');
            base44.auth.redirectToLogin();
            return;
          }
          
          const user = await base44.auth.me();
          if (!user?.data?.omenx_wallet) {
            // Sync wallet to Base44
            await base44.functions.invoke('syncOmenXWallet', { 
              walletAddress: omenxAuth.walletAddress 
            });
            console.log('[AuthGate] Synced OmenX wallet to Base44');
          }
          
          console.log('[AuthGate] Full auth complete (OmenX + Base44)');
          setHasWallet(true);
          setReady(true);
          return;
        } catch (e) {
          console.error('[AuthGate] Base44 auth check failed:', e.message);
          base44.auth.redirectToLogin();
          return;
        }
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
          <OmenXAuthButton onSuccess={() => { setHasWallet(true); checkAuth(); }} />
        </div>
      </div>
    );
  }

  return children;
}