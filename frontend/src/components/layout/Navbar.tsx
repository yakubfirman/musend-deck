import React from 'react';
import { Menu, LogOut, Cpu, Database, Activity } from 'lucide-react';
import { MetricsData } from '../../types';

interface NavbarProps {
  username: string | null;
  metrics: MetricsData | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  username,
  metrics,
  onLogout,
  onToggleSidebar,
}) => {
  return (
    <header className="h-14 bg-canvas-surface border-b border-hairline px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md interactive-tap"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5 w-4">
            <div className="h-0.5 bg-cobalt-600 rounded-full w-full" />
            <div className="h-0.5 bg-cobalt-500 rounded-full w-3/4" />
            <div className="h-0.5 bg-zinc-600 rounded-full w-1/2" />
          </div>
          <span className="font-bold tracking-tight text-sm text-zinc-100">ServerDeck</span>
          <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-white/5">
            musend.web.id
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Mini Telemetry Chips (Desktop only) */}
        {metrics && (
          <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-zinc-400">
            <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded border border-white/5">
              <Cpu className="w-3 h-3 text-status-amber" />
              <span className="tabular-nums">{metrics.cpu.usage_percent}% CPU</span>
            </div>
            <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded border border-white/5">
              <Database className="w-3 h-3 text-cobalt-500" />
              <span className="tabular-nums">{metrics.ram.formatted_used}</span>
            </div>
            <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded border border-white/5">
              <Activity className="w-3 h-3 text-status-emerald" />
              <span className="tabular-nums">{metrics.processes.ep_count} EP</span>
            </div>
          </div>
        )}

        {/* User Account & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-hairline">
          <span className="text-xs font-mono text-zinc-300 hidden sm:inline-block">
            {username || 'yakubfir'}
          </span>
          <button
            onClick={onLogout}
            className="p-1.5 text-zinc-400 hover:text-status-rose hover:bg-zinc-800 rounded-md interactive-tap"
            title="Keluar dari Panel"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
