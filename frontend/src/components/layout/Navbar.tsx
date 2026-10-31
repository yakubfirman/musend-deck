import React, { useState, useEffect } from 'react';
import { Menu, LogOut, Cpu, Database, Activity, Server, ShieldCheck, Download, Command } from 'lucide-react';
import { MetricsData } from '../../types';
import { ThemeToggle } from '../common/ThemeToggle';

interface NavbarProps {
  username: string | null;
  metrics: MetricsData | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  username,
  metrics,
  onLogout,
  onToggleSidebar,
  onOpenCommandPalette,
}) => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  return (
    <header className="h-14 flex-shrink-0 glass-panel px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 border-b border-white/10 shadow-sm">
      {/* Left Brand & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 interactive-tap transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-xl bg-canvas-surface border border-slate-200 dark:border-white/10 shadow-glow-cobalt flex items-center justify-center overflow-hidden flex-shrink-0">
            <img
              src="./icon-192x192.png"
              alt="Musend Deck Logo"
              className="w-5 h-5 object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
              <span>Musend Deck</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-emerald opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-emerald" />
              </span>
            </span>

            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-slate-100 dark:bg-black/40 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
              <Server className="w-3 h-3 text-status-emerald" />
              <span>{hostname}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-slate-100 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
            title="Buka Navigasi Cepat (Ctrl + K)"
          >
            <Command className="w-3.5 h-3.5 text-cobalt-500" />
            <span className="text-[11px]">Navigasi</span>
            <kbd className="text-[10px] bg-white/60 dark:bg-white/10 px-1 py-0.5 rounded text-zinc-500 dark:text-zinc-400 border border-slate-200 dark:border-transparent">Ctrl K</kbd>
          </button>
        )}

        {/* PWA Install Button (shows when installable) */}
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-status-emerald bg-status-emerald/10 hover:bg-status-emerald/20 border border-status-emerald/30 rounded-lg transition-all animate-pulse"
            title="Install Musend Deck sebagai Aplikasi Mandiri"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">Install App</span>
          </button>
        )}

        {/* Quick Mini Telemetry Chips (Desktop only) */}
        {metrics && (
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
              <Cpu className={`w-3.5 h-3.5 ${metrics.cpu.usage_percent > 70 ? 'text-status-amber' : 'text-zinc-500 dark:text-zinc-400'}`} />
              <span className="text-zinc-500 dark:text-zinc-400">CPU:</span>
              <span className={`tabular-nums font-semibold ${metrics.cpu.usage_percent > 85 ? 'text-status-rose' : 'text-zinc-800 dark:text-zinc-200'}`}>
                {metrics.cpu.usage_percent}%
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
              <Database className="w-3.5 h-3.5 text-cobalt-500" />
              <span className="text-zinc-500 dark:text-zinc-400">RAM:</span>
              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                {metrics.ram.formatted_used}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
              <Activity className="w-3.5 h-3.5 text-status-emerald" />
              <span className="text-zinc-500 dark:text-zinc-400">EP:</span>
              <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                {metrics.processes.ep_count}/{metrics.processes.ep_limit}
              </span>
            </div>
          </div>
        )}

        {/* Theme Mode Switcher */}
        <ThemeToggle compact />

        {/* User Account & Logout */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cobalt-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
              {(username || 'a')[0]}
            </div>
            <span className="text-xs font-mono text-zinc-800 dark:text-zinc-300 font-medium hidden sm:inline-block">
              {username || 'admin'}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 text-zinc-400 hover:text-status-rose hover:bg-status-rose/10 rounded-lg border border-transparent hover:border-status-rose/20 interactive-tap transition-all"
            title="Keluar dari Panel"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
