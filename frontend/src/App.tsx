import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { api } from './services/api';
import { MetricsData, RuntimePreflight, ServerSetupInfo } from './types';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { FileTable } from './components/files/FileTable';
import { ProcessTable } from './components/processes/ProcessTable';
import { TerminalView } from './components/terminal/TerminalView';
import { LogViewer } from './components/logs/LogViewer';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SetupWizard } from './pages/SetupWizard';
import { DeployManager } from './components/deploy/DeployManager';
import { DatabaseManager } from './components/database/DatabaseManager';
import { DomainSslViewer } from './components/domains/DomainSslViewer';
import { CronJobManager } from './components/cron/CronJobManager';
import { SecurityAuditorView } from './components/security/SecurityAuditorView';
import { CommandPalette } from './components/common/CommandPalette';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      staleTime: 12000,
      retry: 1,
    },
  },
});

function DashboardApp() {
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isInstalled, setIsInstalled] = useState<boolean>(true);
  const [serverInfo, setServerInfo] = useState<ServerSetupInfo | undefined>(undefined);
  const [preflight, setPreflight] = useState<RuntimePreflight | undefined>(undefined);
  const [setupTokenReady, setSetupTokenReady] = useState<boolean | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  // Global Ctrl+K / Cmd+K Command Palette Shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Initial Auth Check
  useEffect(() => {
    api.checkAuth()
      .then((status) => {
        setIsInstalled(status.installed !== false);
        setServerInfo(status.server_info);
        setPreflight(status.preflight);
        setSetupTokenReady(status.setup_token_ready);
        setIsAuthenticated(status.authenticated);
        setUsername(status.username);
        setAuthChecking(false);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setAuthChecking(false);
      });
  }, []);

  // Poll metrics only when logged in (15s safe interval)
  const {
    data: metrics,
    isLoading: metricsLoading,
    isFetching: metricsFetching,
    refetch: refetchMetrics,
  } = useQuery<MetricsData>({
    queryKey: ['metrics'],
    queryFn: () => api.fetchStats(false),
    enabled: isAuthenticated,
    refetchInterval: activeTab === 'overview' ? 15000 : false,
  });

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshMetrics = useCallback(async (force = true) => {
    setIsRefreshing(true);
    try {
      if (force) {
        const freshData = await api.fetchStats(true);
        queryClient.setQueryData(['metrics'], freshData);
      } else {
        await refetchMetrics();
      }
    } catch (err) {
      console.error('Gagal menyegarkan data:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  }, [refetchMetrics]);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setIsAuthenticated(false);
      setUsername(null);
    }
  }, []);

  const handleLoginSuccess = (user: string) => {
    setIsAuthenticated(true);
    setUsername(user);
    refetchMetrics();
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-canvas-base bg-tech-grid flex flex-col items-center justify-center text-zinc-400 gap-4 relative overflow-hidden">
        <div className="absolute w-72 h-72 bg-cobalt-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-canvas-surface border border-white/10 shadow-glow-cobalt flex items-center justify-center overflow-hidden">
            <img
              src="./icon-192x192.png"
              alt="Musend Deck"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
              }}
            />
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cobalt-400" />
            <span>Memeriksa sesi Musend Deck...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <SetupWizard
        serverInfo={serverInfo}
        preflight={preflight}
        setupTokenReady={setupTokenReady}
        onSetupSuccess={(user) => {
          setIsInstalled(true);
          setIsAuthenticated(true);
          setUsername(user);
          refetchMetrics();
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen max-h-screen bg-canvas-base flex flex-col text-zinc-100 overflow-hidden">
      <Navbar
        username={username}
        metrics={metrics || null}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTab={setActiveTab}
      />

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 lg:p-6 w-full">
          {activeTab === 'overview' && (
            <OverviewPage
              metrics={metrics || null}
              loading={metricsLoading || metricsFetching || isRefreshing}
              onRefresh={handleRefreshMetrics}
            />
          )}

          {activeTab === 'files' && <FileTable />}

          {activeTab === 'processes' && <ProcessTable />}

          {activeTab === 'terminal' && <TerminalView />}

          {activeTab === 'logs' && <LogViewer />}

          {activeTab === 'settings' && <SettingsPage metrics={metrics || undefined} />}

          {activeTab === 'deploy' && <DeployManager />}

          {activeTab === 'database' && <DatabaseManager />}

          {activeTab === 'domains' && <DomainSslViewer />}

          {activeTab === 'cron' && <CronJobManager />}

          {activeTab === 'security' && <SecurityAuditorView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardApp />
    </QueryClientProvider>
  );
}
