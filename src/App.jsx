import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';

import PlayCarousel from './pages/PlayCarousel';
import Game from './pages/Game';
import AuthCallback from './pages/AuthCallback';
import { SaveManager } from './game/SaveManager';

// Heavy pages — lazy loaded for faster initial bundle
const MainMenu = React.lazy(() => import('./pages/MainMenu'));
const Hub = React.lazy(() => import('./pages/Hub'));
const Upgrades = React.lazy(() => import('./pages/Upgrades'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const Info = React.lazy(() => import('./pages/Info'));
const Credits = React.lazy(() => import('./pages/Credits'));
const Achievements = React.lazy(() => import('./pages/Achievements'));
const Squads = React.lazy(() => import('./pages/Squads'));
const Bestiary = React.lazy(() => import('./pages/Bestiary'));
const SynergyCodex = React.lazy(() => import('./pages/SynergyCodex'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NFTDashboard = React.lazy(() => import('./pages/NFTDashboard'));
const LeviathanTrials = React.lazy(() => import('./pages/LeviathanTrials'));
const Dailys = React.lazy(() => import('./pages/Dailys'));
const GlobalRaid = React.lazy(() => import('./pages/GlobalRaid'));
const Mastery = React.lazy(() => import('./pages/Mastery'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const SkuEditor = React.lazy(() => import('./pages/SkuEditor'));
import { initOmenX } from '@/lib/omenx';
import { updateOmenXUser } from '@/lib/omenxUser';
import GamepadManager from './components/GamepadManager';
import { CurrencyProvider } from '@/lib/CurrencyContext';
import { OmenXAuthProvider } from '@/lib/OmenXAuthContext';
import { fetchPlayerData } from '@/lib/playerDataCache';
import AuthGate from './components/AuthGate';
import MaintenanceGate from './components/MaintenanceGate';


const MainApp = () => {
  const [saveInitialized, setSaveInitialized] = useState(false);

  useEffect(() => {
    // Show UI immediately with local save, then merge cloud save in background
    setSaveInitialized(true);
    
    // Load cloud save in background
    SaveManager.initialize();
  }, []);

  const fallback = <div className="fixed inset-0 flex items-center justify-center bg-slate-950"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <React.Suspense fallback={fallback}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<PlayCarousel />} />
        <Route path="/hub" element={<Hub />} />
        <Route path="/upgrades" element={<Upgrades />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/game" element={<Game />} />
        <Route path="/info" element={<Info />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/squads" element={<Squads />} />
        <Route path="/bestiary" element={<Bestiary />} />
        <Route path="/synergy-codex" element={<SynergyCodex />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/nft-dashboard" element={<NFTDashboard />} />
        <Route path="/trials" element={<LeviathanTrials />} />
        <Route path="/dailys" element={<Dailys />} />
        <Route path="/global-raid" element={<GlobalRaid />} />
        <Route path="/mastery" element={<Mastery />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/sku-editor" element={<SkuEditor />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </React.Suspense>
  );
};


function App() {
  useEffect(() => {
    initOmenX().catch(err => console.error('[OmenX] init failed', err));
    // CurrencyProvider subscription will handle centralized fetch

    // Listen for auth data pushed from parent page (when embedded on Omen website)
    const onParentMessage = (event) => {
      const { type, authData } = event.data || {};
      if ((type === 'omenx_auth' || type === 'omenx_auth_response') && authData?.accessToken) {
        console.log('[OmenX] Received auth from parent iframe');
        try {
          localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'omenx_auth_data',
            newValue: JSON.stringify(authData),
            storageArea: localStorage,
          }));
        } catch (e) {}
      }
    };
    window.addEventListener('message', onParentMessage);
    return () => window.removeEventListener('message', onParentMessage);
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <OmenXAuthProvider>
        <CurrencyProvider>
          <GamepadManager />
          <Router>
          <React.Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-slate-950"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            <Routes>
              <Route path="*" element={<MainApp />} />
            </Routes>
          </React.Suspense>
        </Router>
        <Toaster />
        </CurrencyProvider>
      </OmenXAuthProvider>
    </QueryClientProvider>
  )
}

export default App