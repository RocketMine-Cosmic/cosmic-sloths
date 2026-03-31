import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
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
import Profile from './pages/Profile';
import LeviathanTrials from './pages/LeviathanTrials';
import Dailys from './pages/Dailys';
import { SaveManager } from './game/SaveManager';
import SetProfileNameModal from './components/game/SetProfileNameModal';
import React, { useState, useEffect } from 'react';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const [saveInitialized, setSaveInitialized] = useState(false);
  const [needsProfileName, setNeedsProfileName] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !authError) {
      SaveManager.initialize().then(() => {
          setSaveInitialized(true);
          if (user) {
              const save = SaveManager.load();
              if (!user.full_name || user.full_name.includes('@') || !save.hasSetProfileName) {
                  // If they have played before (e.g. have gold or kills) and have a valid name, grandfather them in
                  if ((save.totalKills > 0 || save.gold > 0) && user.full_name && !user.full_name.includes('@') && !save.hasSetProfileName) {
                      save.hasSetProfileName = true;
                      SaveManager.save(save);
                  } else {
                      setNeedsProfileName(true);
                  }
              }
          }
      });
    } else if (authError) {
      setSaveInitialized(true);
    }
  }, [isLoadingAuth, authError, user]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth || (!saveInitialized && !authError)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
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
      <Route path="/profile" element={<Profile />} />
      <Route path="/trials" element={<LeviathanTrials />} />
      <Route path="/dailys" element={<Dailys />} />
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

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App