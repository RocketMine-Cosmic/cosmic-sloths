import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { initOmenX } from '@/lib/omenx';
import { Loader2 } from 'lucide-react';
import SpaceBackground from './game/SpaceBackground';

export default function AuthGate({ children }) {
  const [authState, setAuthState] = useState('loading'); // loading, base44-login, omenx-login, linking, ready, error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check Base44 auth
      const base44User = await base44.auth.me();
      if (!base44User) {
        setAuthState('base44-login');
        return;
      }

      // Check if wallet already linked
      const linkedWallet = base44User.data?.omenx_wallet;
      if (linkedWallet) {
        // Check OmenX auth in localStorage
        const omenxAuth = localStorage.getItem('omenx_auth_data');
        if (omenxAuth) {
          try {
            const parsed = JSON.parse(omenxAuth);
            if (parsed?.walletAddress === linkedWallet && parsed?.accessToken) {
              setAuthState('ready');
              return;
            }
          } catch {}
        }
        // OmenX auth missing, need to re-auth
        setAuthState('omenx-login');
        return;
      }

      // Wallet not linked yet, need OmenX auth
      setAuthState('omenx-login');
    } catch (e) {
      console.error('[AuthGate] checkAuth failed:', e.message);
      setAuthState('base44-login');
    }
  };

  const handleBase44Login = () => {
    base44.auth.redirectToLogin();
  };

  const handleOmenXLogin = async () => {
    try {
      setAuthState('omenx-login');
      await initOmenX();
      
      // Wait for OmenX to store auth in localStorage
      const maxWait = 30000;
      const startTime = Date.now();
      const checkInterval = setInterval(async () => {
        const omenxAuth = localStorage.getItem('omenx_auth_data');
        if (omenxAuth) {
          clearInterval(checkInterval);
          try {
            const parsed = JSON.parse(omenxAuth);
            if (parsed?.walletAddress && parsed?.accessToken) {
              setAuthState('linking');
              // Link wallet to Base44 user
              await base44.auth.updateMe({
                omenx_wallet: parsed.walletAddress,
                pilot_icon: parsed.pilot_icon || '🦥'
              });
              setAuthState('ready');
            }
          } catch (e) {
            setErrorMsg('Failed to link wallets');
            setAuthState('error');
          }
        } else if (Date.now() - startTime > maxWait) {
          clearInterval(checkInterval);
          setErrorMsg('OmenX login timeout');
          setAuthState('error');
        }
      }, 500);
    } catch (e) {
      setErrorMsg(e.message || 'OmenX login failed');
      setAuthState('error');
    }
  };

  if (authState === 'ready') {
    return children;
  }

  return (
    <div className="min-h-screen relative text-slate-200 flex items-center justify-center font-sans">
      <SpaceBackground />
      <div className="relative z-10 bg-[#0b0416]/95 border border-cyan-900/50 rounded-2xl p-8 md:p-12 max-w-md w-full mx-4 shadow-2xl">
        <h1 className="text-3xl font-black uppercase tracking-widest text-center mb-2" style={{ color: '#06b6d4', textShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
          COSMIC SLOTHS
        </h1>
        <p className="text-center text-slate-400 text-sm mb-8">Unified Authentication</p>

        {errorMsg && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-6 text-red-300 text-sm">
            {errorMsg}
            {authState === 'error' && (
              <button
                onClick={() => checkAuth()}
                className="mt-3 w-full bg-red-700 hover:bg-red-600 text-white py-2 rounded text-sm font-bold"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {authState === 'base44-login' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm text-center">Step 1: Login with Base44</p>
            <button
              onClick={handleBase44Login}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-bold transition-colors"
            >
              Login with Base44
            </button>
          </div>
        )}

        {authState === 'omenx-login' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm text-center font-bold">Step 2: Connect OmenX Wallet (Required)</p>
            <p className="text-slate-400 text-xs text-center">You need an OmenX wallet to receive leaderboard and raid rewards.</p>
            <button
              onClick={handleOmenXLogin}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
            >
              Connect OmenX Wallet
            </button>
          </div>
        )}

        {(authState === 'linking' || authState === 'omenx-login') && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
              <p className="text-cyan-400 font-bold text-sm">
                {authState === 'omenx-login' ? 'Waiting for wallet...' : 'Linking wallets...'}
              </p>
              <p className="text-slate-500 text-xs">Check your wallet popup</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}