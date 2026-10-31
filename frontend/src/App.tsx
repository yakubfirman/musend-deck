import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { api } from './services/api';
import { MetricsData, ServerSetupInfo } from './types';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Initial Auth Check
  useEffect(() => {
    api.checkAuth()
      .then((status) => {
        setIsInstalled(status.installed !== false);
        setServerInfo(status.server_info);
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
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<MetricsData>({
    queryKey: ['metrics'],
    queryFn: () => api.fetchStats(false),
    enabled: isAuthenticated,
    refetchInterval: activeTab === 'overview' ? 15000 : false,
  });

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
          <div className="p-3 rounded-2xl bg-canvas-surface/80 border border-white/10 shadow-glow-cobalt backdrop-blur-md">
            <div className="flex flex-col gap-1 w-6">
              <div className="h-1 bg-gradient-to-r from-cobalt-500 to-indigo-500 rounded-full w-full" />
              <div className="h-1 bg-gradient-to-r from-cobalt-400 to-cyan-400 rounded-full w-3/4" />
              <div className="h-1 bg-zinc-600 rounded-full w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cobalt-400" />
            <span>Memeriksa sesi ServerDeck...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <SetupWizard
        serverInfo={serverInfo}
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
      />

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewPage
              metrics={metrics || null}
              loading={metricsLoading}
              onRefresh={(force) => {
                if (force) {
                  api.fetchStats(true).then(() => refetchMetrics());
                } else {
                  refetchMetrics();
                }
              }}
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
