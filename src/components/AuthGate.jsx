import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function AuthGate({ children }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin();
        return;
      }
      
      const user = await base44.auth.me();
      if (!user?.data?.omenx_wallet) {
        // User is authenticated but no wallet — let them proceed, wallet can be linked later
        setIsAuthenticated(true);
        setReady(true);
        return;
      }
      
      setIsAuthenticated(true);
      setReady(true);
    } catch (err) {
      console.error('[AuthGate] Check failed:', err);
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