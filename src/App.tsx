import { useState, useEffect } from "react";
import { useStore } from "./hooks/useStore";
import { useTheme } from "./hooks/useTheme";
import { BottomNav } from "./components/BottomNav";
import { OnboardingAdviceModal } from "./components/OnboardingAdviceModal";
import { DailySalesBriefingModal } from "./components/DailySalesBriefingModal";
import { Dashboard } from "./pages/Dashboard";
import { Sales } from "./pages/Sales";
import { Expenses } from "./pages/Expenses";
import { Stock } from "./pages/Stock";
import { Reports } from "./pages/Reports";
import { DataManagement } from "./pages/DataManagement";
import type { Tab } from "./types";
import { Sun, Moon, RotateCw, Wifi, WifiOff, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const VALID_TABS: Tab[] = ["dashboard", "sales", "expenses", "stock", "reports", "data"];

function App() {
  // Remember and restore the user's active page across page refreshes (e.g. Sales)
  const [activeTab, setActiveTabState] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chicken_stall_active_tab") as Tab;
      if (VALID_TABS.includes(saved)) {
        return saved;
      }
    }
    return "dashboard";
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [openBriefingManual, setOpenBriefingManual] = useState(false);

  const store = useStore();
  const { theme, toggleTheme } = useTheme();

  // Persist current tab to localStorage so refresh keeps user on the same page
  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("chicken_stall_active_tab", tab);
    }
  };

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard store={store} onNavigate={setActiveTab} onOpenBriefing={() => setOpenBriefingManual(true)} />;
      case "sales": return <Sales store={store} />;
      case "expenses": return <Expenses store={store} />;
      case "stock": return <Stock store={store} />;
      case "reports": return <Reports store={store} />;
      case "data": return <DataManagement store={store} />;
      default: return <Dashboard store={store} onNavigate={setActiveTab} onOpenBriefing={() => setOpenBriefingManual(true)} />;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'light bg-slate-50 text-slate-900'} flex flex-col transition-colors duration-200`}>
      {/* 1. Daily Sales Briefing Popup (Shows on opening every day) */}
      <DailySalesBriefingModal
        store={store}
        onNavigate={setActiveTab}
        isOpenManual={openBriefingManual}
        onCloseManual={() => setOpenBriefingManual(false)}
      />

      {/* 2. Onboarding Setup Advice Modal */}
      <OnboardingAdviceModal store={store} />

      {/* 3. Header with Stall Logo, Name, Theme Toggle & Status */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm transition-colors">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-1 bg-orange-100 dark:bg-orange-500/20 rounded-xl border border-orange-300 dark:border-orange-500/30 flex items-center justify-center">
              {store.shopLogo || "🐓"}
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {store.shopName || "Chicken Stall"}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {store.storageFolderName ? `📁 ${store.storageFolderName}` : "Shop Manager"}
              </p>
            </div>
          </div>

          {/* Right Controls: Theme Toggle, Sync Badge, Connectivity Status */}
          <div className="flex items-center gap-2">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark and Light Mode"
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
            </button>

            {/* Pending Sync Badge */}
            {store.pendingSyncCount > 0 && (
              <button
                onClick={() => store.triggerSync()}
                title="Tap to sync pending records"
                className="flex items-center gap-1 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full text-[11px] font-bold active:scale-95 transition-transform"
              >
                <RotateCw size={12} className={store.isSyncing ? "animate-spin" : ""} />
                <span>{store.pendingSyncCount}</span>
              </button>
            )}

            {/* Online/Offline Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                store.isOnline
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300"
              }`}
            >
              {store.isOnline ? (
                <>
                  <Wifi size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={13} className="text-amber-600 dark:text-amber-400" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sync Status Info Bar */}
        {store.lastSyncTime && (
          <div className="max-w-md mx-auto mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
            <span>Last synced: {store.lastSyncTime}</span>
            {store.syncError && <span className="text-amber-600 dark:text-amber-400 truncate max-w-[180px]">{store.syncError}</span>}
          </div>
        )}
      </header>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Download size={15} />
            <span className="font-medium">Install app on your phone for offline use</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleInstallClick}
              className="bg-white text-slate-900 font-bold px-2.5 py-1 rounded-md text-[11px] shadow-sm active:scale-95"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-white/80 hover:text-white px-1.5 py-1 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 pb-24 flex-1">
        {renderPage()}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default App;
