import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Cpu,
  Terminal,
  FileText,
  Settings,
  X,
  Server
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
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'files' as NavTab, label: 'File Manager', icon: FolderOpen },
    { id: 'processes' as NavTab, label: 'Processes', icon: Cpu },
    { id: 'terminal' as NavTab, label: 'Web Console', icon: Terminal },
    { id: 'logs' as NavTab, label: 'Log Viewer', icon: FileText },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-canvas-surface border-r border-hairline w-60">
      {/* Mobile Drawer Header */}
      <div className="h-14 border-b border-hairline px-4 flex items-center justify-between md:hidden">
        <span className="font-semibold text-xs text-zinc-100 uppercase tracking-wider font-mono">
          Menu Navigasi
        </span>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-white rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-mono text-zinc-500 px-3 py-2 uppercase tracking-wider">
          Sistem & File
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 font-semibold border-l-2 border-cobalt-600'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cobalt-500' : 'text-zinc-500'}`} strokeWidth={1.75} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Host Environment Info */}
      <div className="p-3 border-t border-hairline">
        <div className="bg-canvas-base p-2.5 rounded border border-hairline space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <Server className="w-3 h-3 text-status-emerald" />
            <span>LiteSpeed + CageFS</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 truncate">
            /home/yakubfir/
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block flex-shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
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
