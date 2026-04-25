import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import SpaceBackground from './game/SpaceBackground';

export default function MaintenanceGate({ children }) {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const user = await base44.auth.me();
      setIsAdmin(user?.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen relative text-slate-200 flex items-center justify-center font-sans">
        <SpaceBackground />
        <div className="relative z-10 bg-[#0b0416]/95 border border-yellow-900/50 rounded-2xl p-8 md:p-12 max-w-md w-full mx-4 shadow-2xl text-center">
          <h1 className="text-3xl font-black uppercase tracking-widest mb-4" style={{ color: '#fbbf24', textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
            Under Maintenance
          </h1>
          <p className="text-slate-400 text-base mb-2">Cosmic Sloths is currently being prepared for launch.</p>
          <p className="text-slate-500 text-sm">Check back soon for the grand opening.</p>
        </div>
      </div>
    );
  }

  return children;
}