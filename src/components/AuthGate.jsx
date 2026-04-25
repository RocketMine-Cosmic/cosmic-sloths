import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function AuthGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const user = await base44.auth.me();
      if (!user?.data?.omenx_wallet) {
        base44.auth.redirectToLogin();
        return;
      }
      setReady(true);
    } catch {
      base44.auth.redirectToLogin();
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return children;
}