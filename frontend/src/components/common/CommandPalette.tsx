import React, { useState, useEffect, useRef } from 'react';
import { NavTab } from '../layout/Sidebar';
import {
  LayoutDashboard,
  FolderOpen,
  Cpu,
  Terminal,
  FileText,
  Rocket,
  Database,
  Globe,
  Clock,
  ShieldCheck,
  Settings,
  Search,
  X,
  Command,
  ArrowRight
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
}

interface PaletteItem {
  id: string;
  tab: NavTab;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items: PaletteItem[] = [
    { id: 'overview', tab: 'overview', title: 'Hosting Telemetry Overview', category: 'Monitoring', icon: LayoutDashboard, badge: 'Live' },
    { id: 'files', tab: 'files', title: 'File Manager & Code Editor', category: 'Monitoring', icon: FolderOpen },
    { id: 'processes', tab: 'processes', title: 'Process Viewer & Kill Signal', category: 'Monitoring', icon: Cpu, badge: 'CPU' },
    { id: 'terminal', tab: 'terminal', title: 'Web Console Terminal', category: 'Monitoring', icon: Terminal },
    { id: 'logs', tab: 'logs', title: 'Real-time Log Viewer', category: 'Monitoring', icon: FileText },
    { id: 'deploy', tab: 'deploy', title: 'Deployment Center & Auto-Build', category: 'DevOps', icon: Rocket, badge: 'CI/CD' },
    { id: 'database', tab: 'database', title: 'Database Inspector & 1-Click Backup', category: 'DevOps', icon: Database, badge: 'SQL' },
    { id: 'domains', tab: 'domains', title: 'Domain & SSL Expiry Monitor', category: 'DevOps', icon: Globe, badge: 'SSL' },
    { id: 'cron', tab: 'cron', title: 'Cron Jobs Manager & Scheduler', category: 'DevOps', icon: Clock },
    { id: 'security', tab: 'security', title: 'Security Audit & Permission Normalizer', category: 'Security', icon: ShieldCheck, badge: 'Audit' },
    { id: 'settings', tab: 'settings', title: 'Settings, Housekeeping & Password', category: 'Sistem', icon: Settings },
  ];

  const filtered = items.filter(
    (i) =>
      i.title.toLowerCase().includes(query.toLowerCase()) ||
      i.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setSelectedIndex(0);
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelectTab(filtered[selectedIndex].tab);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose, onSelectTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-canvas-surface glass-card rounded-2xl border border-slate-200 dark:border-white/20 shadow-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-black/40">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Cari tab atau perintah navigasi cepat..."
            className="w-full bg-transparent text-sm font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = selectedIndex === idx;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.tab);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                  isSelected
                    ? 'bg-cobalt-500/10 dark:bg-cobalt-600/20 text-cobalt-600 dark:text-white border border-cobalt-500/30 font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-cobalt-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-zinc-900 dark:text-white font-medium">{item.title}</div>
                    <div className="text-[10px] text-zinc-500">{item.category}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400">
                      {item.badge}
                    </span>
                  )}
                  {isSelected && <ArrowRight className="w-3.5 h-3.5 text-cobalt-400" />}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-xs font-mono">
              Tidak ada tab atau perintah yang cocok dengan "{query}"
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 px-3.5 bg-black/60 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigasi</span>
            <span>↵ Pilih</span>
            <span>ESC Tutup</span>
          </div>
          <span>Musend Deck Quick Menu</span>
        </div>
      </div>
    </div>
  );
};
