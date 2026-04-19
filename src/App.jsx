import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
// Add page imports here
import OmenXCallback from './pages/OmenXCallback';
import MainMenu from './pages/MainMenu';
import Hub from './pages/Hub';
import Upgrades from './pages/Upgrades.jsx';
import LeaderboardPage from './pages/LeaderboardPage';
import PlayCarousel from './pages/PlayCarousel';
import Game from './pages/Game';
import Info from './pages/Info';
import Credits from './pages/Credits';
import Achievements from './pages/Achievements';
import Squads from './pages/Squads';
import Bestiary from './pages/Bestiary';
import SynergyCodex from './pages/SynergyCodex';
import Profile from './pages/Profile';
import LeviathanTrials from './pages/LeviathanTrials';
import Dailys from './pages/Dailys';
import GlobalRaid from './pages/GlobalRaid';
import Mastery from './pages/Mastery';
import AdminDashboard from './pages/AdminDashboard';
import SkuEditor from './pages/SkuEditor';
import { SaveManager } from './game/SaveManager';
import SetProfileNameModal from './components/game/SetProfileNameModal';
import React, { useState, useEffect } from 'react';
import { initOmenX } from '@/lib/omenx';
import { getAuthFromIndexedDB } from '@/lib/indexedDbAuth';
import { base44 } from '@/api/base44Client';
import GamepadManager from './components/GamepadManager';
import { CurrencyProvider } from '@/lib/CurrencyContext';

const MainApp = () => {
  const [saveInitialized, setSaveInitialized] = useState(false);
  const [needsProfileName, setNeedsProfileName] = useState(false);

  useEffect(() => {
    SaveManager.initialize().then(async () => {
        setSaveInitialized(true);
        // Check if OmenX is logged in and profile name is set
        const omenxAuth = await getAuthFromIndexedDB();
        if (omenxAuth) {
            // Load server-side PlayerSave if it exists
            try {
                const { data: response } = await base44.functions.invoke('loadSave', {
                    walletAddress: omenxAuth.walletAddress,
                    accessToken: omenxAuth.accessToken
                });
                if (response?.saveData) {
                    // Server save exists, use it (overwrite local if stale)
                    localStorage.setItem('cosmic_sloth_save', JSON.stringify(response.saveData));
                    console.log('[App] Loaded server PlayerSave');
                }
            } catch (e) {
                console.log('[App] Could not load server save:', e.message);
            }

            const save = SaveManager.load();
            if (!save.hasSetProfileName) {
                // Grandfather in players who have already played
                if (save.totalKills > 0 || save.gold > 0) {
                    save.hasSetProfileName = true;
                    SaveManager.save(save);
                } else {
                    setNeedsProfileName(true);
                }
            }
        }
    });
  }, []);

  // In preview mode, bypass all auth gates
  const isPreview = window.self !== window.top;
  if (isPreview) {
    return (
      <>
        <Routes>
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
          <Route path="/trials" element={<LeviathanTrials />} />
          <Route path="/dailys" element={<Dailys />} />
          <Route path="/global-raid" element={<GlobalRaid />} />
          <Route path="/mastery" element={<Mastery />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/sku-editor" element={<SkuEditor />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </>
    );
  }

  // Show loading spinner while initializing save
  if (!saveInitialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render the main app
  return (
    <>
    <Routes>
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
      <Route path="/trials" element={<LeviathanTrials />} />
      <Route path="/dailys" element={<Dailys />} />
      <Route path="/global-raid" element={<GlobalRaid />} />
      <Route path="/mastery" element={<Mastery />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    {needsProfileName && (
      <SetProfileNameModal onComplete={() => {
          const save = SaveManager.load();
          save.hasSetProfileName = true;
          SaveManager.save(save);
          setNeedsProfileName(false);
      }} />
    )}
    </>
  );
};


function App() {
  useEffect(() => {
    initOmenX().catch(err => console.error('[OmenX] init failed', err));
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <CurrencyProvider>
        <GamepadManager />
        <Router>
          <Routes>
            {/* OmenX OAuth callback */}
            <Route path="/auth/callback" element={<OmenXCallback />} />
            <Route path="*" element={<MainApp />} />
          </Routes>
        </Router>
        <Toaster />
      </CurrencyProvider>
    </QueryClientProvider>
  )
}

export default App