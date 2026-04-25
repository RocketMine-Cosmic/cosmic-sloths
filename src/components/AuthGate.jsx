import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { initOmenX } from '@/lib/omenx';
import { Loader2 } from 'lucide-react';
import SpaceBackground from './game/SpaceBackground';

export default function AuthGate({ children }) {
  const [ready, setReady] = useState(false);
  const [walletLinked, setWalletLinked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        setReady(true);
        return;
      }

      if (user.data?.omenx_wallet) {
        setWalletLinked(true);
        setReady(true);
      } else {
        setReady(true);
      }
    } catch (e) {
      console.error('[AuthGate] checkWallet failed:', e.message);
      setReady(true);
    }
  };

  const handleOmenXLogin = async () => {
    try {
      await initOmenX();
      
      const maxWait = 30000;
      const startTime = Date.now();
      const checkInterval = setInterval(async () => {
        const omenxAuth = localStorage.getItem('omenx_auth_data');
        if (omenxAuth) {
          clearInterval(checkInterval);
          try {
            const parsed = JSON.parse(omenxAuth);
            if (parsed?.walletAddress && parsed?.accessToken) {
              await base44.auth.updateMe({
                omenx_wallet: parsed.walletAddress,
                pilot_icon: parsed.pilot_icon || '🦥'
              });
              setWalletLinked(true);
            }
          } catch (e) {
            setErrorMsg('Failed to link wallets');
          }
        } else if (Date.now() - startTime > maxWait) {
          clearInterval(checkInterval);
          setErrorMsg('OmenX login timeout');
        }
      }, 500);
    } catch (e) {
      setErrorMsg(e.message || 'OmenX login failed');
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!walletLinked) {
    return (
      <div className="min-h-screen relative text-slate-200 flex items-center justify-center font-sans">
        <SpaceBackground />
        <div className="relative z-10 bg-[#0b0416]/95 border border-cyan-900/50 rounded-2xl p-8 md:p-12 max-w-md w-full mx-4 shadow-2xl">
          <h1 className="text-3xl font-black uppercase tracking-widest text-center mb-2" style={{ color: '#06b6d4', textShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
            COSMIC SLOTHS
          </h1>
          <p className="text-center text-slate-400 text-sm mb-8">Connect Your OmenX Wallet</p>

          {errorMsg && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 mb-6 text-red-300 text-sm">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleOmenXLogin}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-bold transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return children;
}