import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext';

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [isOpen]);

  const options: Array<{ mode: ThemeMode; label: string; icon: typeof Sun }> = [
    { mode: 'light', label: 'Terang', icon: Sun },
    { mode: 'dark', label: 'Gelap', icon: Moon },
    { mode: 'system', label: 'Sistem', icon: Laptop },
  ];

  const CurrentIcon = theme === 'system' ? Laptop : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`Tema: ${theme === 'system' ? 'Sesuai Device' : theme === 'dark' ? 'Mode Gelap' : 'Mode Terang'}`}
        className="flex items-center gap-1.5 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-slate-100 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 interactive-tap transition-all shadow-sm"
        aria-label="Pilih Tema Tampilan"
      >
        <CurrentIcon className="w-4 h-4 text-cobalt-500 dark:text-cobalt-400" />
        {!compact && (
          <span className="text-xs font-mono hidden md:inline capitalize">
            {theme === 'system' ? 'Auto' : theme}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white/95 dark:bg-canvas-surface/95 border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-2xl py-1.5 z-50 animate-fade-in">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-slate-200 dark:border-white/5">
            Pilihan Tema
          </div>
          <div className="p-1 space-y-0.5 font-mono text-xs">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => {
                    setTheme(opt.mode);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-cobalt-500/10 dark:bg-cobalt-600/20 text-cobalt-600 dark:text-cobalt-400 font-semibold border border-cobalt-500/20'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cobalt-500 dark:text-cobalt-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
