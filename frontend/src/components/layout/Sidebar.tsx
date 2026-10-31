import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Cpu,
  Terminal,
  FileText,
  Settings,
  X,
  Server,
  Shield,
  ExternalLink
} from 'lucide-react';

export type NavTab = 'overview' | 'files' | 'processes' | 'terminal' | 'logs' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard, badge: 'Live' },
    { id: 'files' as NavTab, label: 'File Manager', icon: FolderOpen },
    { id: 'processes' as NavTab, label: 'Processes', icon: Cpu, badge: 'LVE' },
    { id: 'terminal' as NavTab, label: 'Web Console', icon: Terminal },
    { id: 'logs' as NavTab, label: 'Log Viewer', icon: FileText },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-canvas-surface/95 border-r border-white/10 w-64 backdrop-blur-xl flex-shrink-0 select-none">
      {/* Mobile Drawer Header */}
      <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between md:hidden">
        <span className="font-semibold text-xs text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Shield className="w-4 h-4 text-cobalt-400" />
          <span>Navigasi Panel</span>
        </span>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Tutup Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-mono font-semibold text-zinc-400 px-3 py-1.5 uppercase tracking-wider">
          Menu Kontrol
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cobalt-600/20 to-transparent text-white font-semibold border border-cobalt-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1 rounded-lg ${isActive ? 'bg-cobalt-600 text-white shadow-sm' : 'text-zinc-400'}`}>
                  <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
                </div>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  isActive
                    ? 'bg-cobalt-500/20 text-cobalt-300 font-semibold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Host Environment Info */}
      <div className="p-3.5 border-t border-white/10 space-y-2">
        <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300 font-medium">
              <Server className="w-3.5 h-3.5 text-status-emerald" />
              <span>CageFS Isolated</span>
            </span>
            <span className="text-[9px] font-mono bg-status-emerald/10 text-status-emerald px-1.5 py-0.5 rounded border border-status-emerald/20">
              Active
            </span>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 truncate">
            /home/yakubfir/
          </div>
          
          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono text-zinc-400">
            <span>LiteSpeed Server</span>
            <span className="text-zinc-300 font-semibold">0 MB Idle</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Fixed Sidebar */}
      <aside className="hidden md:flex flex-col flex-shrink-0 z-20 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
