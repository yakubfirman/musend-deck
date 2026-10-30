import React, { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { api } from './services/api';
import { MetricsData } from './types';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { FileTable } from './components/files/FileTable';
import { ProcessTable } from './components/processes/ProcessTable';
import { TerminalView } from './components/terminal/TerminalView';
import { LogViewer } from './components/logs/LogViewer';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Initial Auth Check
  useEffect(() => {
    api.checkAuth()
      .then((status) => {
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
      <div className="min-h-screen bg-canvas-base flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-cobalt-500" />
        <span className="font-mono text-xs">Memeriksa sesi ServerDeck...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-canvas-base flex flex-col text-zinc-100">
      <Navbar
        username={username}
        metrics={metrics || null}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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
