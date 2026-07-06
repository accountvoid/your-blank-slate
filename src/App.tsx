import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { usePunishment } from "@/hooks/usePunishment";
import { LevelUpModal } from "@/components/LevelUpModal";
import { GameOverModal } from "@/components/GameOverModal";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AppHeader } from "@/components/AppHeader";
import { preloadAssets, preloadRoutes } from "@/lib/assetPreload";

import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import { RequireRole } from "./components/admin/RequireRole";

// Lazy chunks — preloaded on idle after auth.
const Quests = lazy(() => import("./pages/Quests"));
const Gates = lazy(() => import("./pages/Gates"));
const Battle = lazy(() => import("./pages/Battle"));
const MonsterBattle = lazy(() => import("./pages/MonsterBattle"));
const Dungeon = lazy(() => import("./pages/Dungeon"));
const Abilities = lazy(() => import("./pages/Abilities"));
const Stats = lazy(() => import("./pages/Stats"));
const Achievements = lazy(() => import("./pages/Achievements"));
const GrandQuest = lazy(() => import("./pages/GrandQuest"));
const Market = lazy(() => import("./pages/Market"));
const Profile = lazy(() => import("./pages/Profile"));
const Penalty = lazy(() => import("./pages/Penalty"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder"));
const AdminShopItems = lazy(() => import("./pages/admin/AdminShopItems"));
const AdminGateItems = lazy(() => import("./pages/admin/AdminGateItems"));

const LAZY_LOADERS = [
  () => import("./pages/Quests"),
  () => import("./pages/Gates"),
  () => import("./pages/Battle"),
  () => import("./pages/Dungeon"),
  () => import("./pages/Stats"),
  () => import("./pages/Market"),
  () => import("./pages/Profile"),
  () => import("./pages/Penalty"),
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const { gameState, levelUpInfo, dismissLevelUp, resetGame } = useGameState();
  const { user, loading: authLoading } = useAuth();
  const { active: punishmentActive, enforceDeadline } = usePunishment();
  const location = useLocation();
  const navigate = useNavigate();

  // Warm assets + lazy chunks once authed.
  useEffect(() => {
    preloadAssets();
    if (user) preloadRoutes(LAZY_LOADERS);
  }, [user]);

  // Global MP < 10 toast for quest/portal entry attempts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ current?: number; required?: number }>).detail || {};
      toast.error('Mana منخفضة', {
        description: `تحتاج ${detail.required ?? 10} MP على الأقل لبدء أي مهمة أو دخول بوابة. (الحالي: ${Math.floor(detail.current ?? 0)})`,
      });
    };
    window.addEventListener('mp-too-low', handler);
    return () => window.removeEventListener('mp-too-low', handler);
  }, []);

  // Re-enforce deadline whenever the app regains visibility.
  useEffect(() => {
    if (!user) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') enforceDeadline();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user, enforceDeadline]);

  // Force redirect to /penalty whenever punishment is active.
  useEffect(() => {
    if (!user) return;
    if (punishmentActive && location.pathname !== '/penalty') {
      navigate('/penalty', { replace: true });
    }
  }, [user, punishmentActive, location.pathname, navigate]);

  if (authLoading) {
    return <LoadingScreen fullScreen message="SETVOID" />;
  }

  const needsPassword = typeof window !== 'undefined' && localStorage.getItem('needsPassword') === 'true';
  if (!user || !gameState.isOnboarded || needsPassword) {
    return <Onboarding />;
  }

  return (
    <>
      {!location.pathname.startsWith('/admin') && <AppHeader />}
      <Suspense fallback={<LoadingScreen fullScreen message="LOADING" />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/gates" element={<Gates />} />
          <Route path="/battle" element={<Battle />} />
          <Route path="/battle/monster" element={<MonsterBattle />} />
          <Route path="/dungeon" element={<Dungeon />} />
          <Route path="/abilities" element={<Abilities />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/grand-quest" element={<GrandQuest />} />
          <Route path="/market" element={<Market />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/penalty" element={<Penalty />} />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="shop-items" element={<AdminPlaceholder title="Shop Items" description="Manage the market catalog." />} />
            <Route path="gate-items" element={<AdminPlaceholder title="Gate Items" description="Manage gate drop pools." />} />
            <Route path="users" element={<AdminPlaceholder title="Users" description="Search, ban, and adjust player state." />} />
            <Route path="side-missions" element={<AdminPlaceholder title="Side Missions" description="Manage the daily side mission catalog." />} />
            <Route path="main-quests" element={<AdminPlaceholder title="Main Quests" description="Manage main quest templates." />} />
            <Route path="ads" element={<AdminPlaceholder title="Ads" description="Manage advertising campaigns." />} />
            <Route path="audit" element={<AdminPlaceholder title="Audit Logs" description="Every admin action recorded." />} />
            <Route path="settings" element={<AdminPlaceholder title="Settings" description="Global multipliers, timers, and drop rates." />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {levelUpInfo && (
        <LevelUpModal
          show={levelUpInfo.show}
          newLevel={levelUpInfo.newLevel}
          category={levelUpInfo.category}
          onDismiss={dismissLevelUp}
        />
      )}

      {gameState.hp <= 0 && (
        <GameOverModal show={true} onRestart={resetGame} />
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
