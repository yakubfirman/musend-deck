import { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Trash2,
  Loader2,
  CornerDownLeft,
  Sparkles,
  Check,
  Copy,
  Folder,
  FolderOpen,
  FileText,
  Home,
  ChevronRight,
  ArrowUp,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';

interface HistoryItem {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: string;
  cwd: string;
}

export const TerminalView: React.FC = () => {
  const [command, setCommand] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [running, setRunning] = useState<boolean>(false);
  const [completing, setCompleting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Array<{ value: string; name: string; is_dir: boolean }>>([]);
  const [suggestionPrefix, setSuggestionPrefix] = useState<string>('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [currentCwd, setCurrentCwd] = useState<string>(() => {
    return localStorage.getItem('serverdeck_terminal_cwd') || '';
  });
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus terminal input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load command history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('serverdeck_terminal_cmd_history');
    if (saved) {
      try {
        setCommandHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveCommandToHistory = (cmd: string) => {
    const updated = [cmd, ...commandHistory.filter((c) => c !== cmd)].slice(0, 50);
    setCommandHistory(updated);
    localStorage.setItem('serverdeck_terminal_cmd_history', JSON.stringify(updated));
  };

  const scrollToBottom = () => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, suggestions]);

  // Focus terminal input unless user is selecting text to copy
  const focusInput = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;
    inputRef.current?.focus();
  };

  const handleTabComplete = async () => {
    if (running || completing) return;

    // If suggestions are already showing and user presses Tab, cycle through them
    if (suggestions.length > 0) {
      const nextIndex = (activeSuggestionIndex + 1) % suggestions.length;
      setActiveSuggestionIndex(nextIndex);
      const chosen = suggestions[nextIndex];
      const newCmd = suggestionPrefix + chosen.value;
      setCommand(newCmd);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = inputRef.current.selectionEnd = newCmd.length;
        }
      }, 0);
      return;
    }

    // Fetch tab autocomplete matches from backend
    setCompleting(true);
    try {
      const res = await api.completeTerminal(command, currentCwd);
      if (res && res.matches && res.matches.length > 0) {
        setSuggestionPrefix(res.prefix || '');
        if (res.matches.length === 1) {
          // Exactly 1 match: auto-fill line immediately
          const completed = res.completed_line;
          setCommand(completed);
          setSuggestions([]);
          setActiveSuggestionIndex(-1);
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.selectionStart = inputRef.current.selectionEnd = completed.length;
            }
          }, 0);
        } else {
          // Multiple matches: extend common prefix if available and display suggestions tray
          if (res.completed_line && res.completed_line.length > command.length) {
            setCommand(res.completed_line);
          }
          setSuggestions(res.matches);
          setActiveSuggestionIndex(-1);
        }
      } else {
        setSuggestions([]);
        setActiveSuggestionIndex(-1);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setCompleting(false);
    }
  };

  const executeCommand = async (cmdToRun = command, overrideCwd?: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed || running) return;

    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    saveCommandToHistory(trimmed);
    setHistoryIndex(-1);

    // Client-side clear screen (Ctrl+L or "clear" / "cls")
    if (trimmed === 'clear' || trimmed === 'cls') {
      setHistory([]);
      setCommand('');
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    setRunning(true);
    const activeCwd = overrideCwd !== undefined ? overrideCwd : currentCwd;
    const timeStr = new Date().toLocaleTimeString();

    try {
      const res = await api.runTerminal(trimmed, activeCwd);

      // Update current working directory if returned
      let newCwd = activeCwd;
      if (res && typeof res.cwd === 'string') {
        newCwd = res.cwd;
        setCurrentCwd(res.cwd);
        localStorage.setItem('serverdeck_terminal_cwd', res.cwd);
      }

      let displayOutput = res.output || '';
      if (!displayOutput && (trimmed.startsWith('cd ') || trimmed === 'cd')) {
        displayOutput = `(Direktori aktif: ~${newCwd ? '/' + newCwd : ''})`;
      } else if (!displayOutput) {
        displayOutput = '(Perintah selesai tanpa output)';
      }

      setHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          output: displayOutput,
          exitCode: res.exit_code ?? 0,
          timestamp: timeStr,
          cwd: activeCwd,
        },
      ]);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          output: err.message || 'Gagal mengeksekusi perintah.',
          exitCode: 1,
          timestamp: timeStr,
          cwd: activeCwd,
        },
      ]);
    } finally {
      setCommand('');
      setRunning(false);
      // Immediately restore focus without requiring user click
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tab: Trigger smart Bash completion
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
      return;
    }

    // Escape: Dismiss autocomplete suggestions
    if (e.key === 'Escape') {
      if (suggestions.length > 0) {
        e.preventDefault();
        setSuggestions([]);
        setActiveSuggestionIndex(-1);
        return;
      }
    }

    // Ctrl + L: Clear terminal screen like standard bash
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      setHistory([]);
      return;
    }

    // Ctrl + C: Clear current input line like SIGINT
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      setCommand('');
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        const val = commandHistory[nextIndex];
        setCommand(val);
        setSuggestions([]);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = val.length;
          }
        }, 0);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        const val = commandHistory[nextIndex] || '';
        setCommand(val);
        setSuggestions([]);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = val.length;
          }
        }, 0);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
        setSuggestions([]);
      }
    }
  };

  const handleCopyOutput = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const navigateToCrumb = (index: number, segments: string[]) => {
    if (index < 0) {
      executeCommand('cd ~');
    } else {
      const targetPath = segments.slice(0, index + 1).join('/');
      executeCommand(`cd ~/${targetPath}`);
    }
    inputRef.current?.focus();
  };

  const navigateUp = () => {
    if (!currentCwd) return;
    executeCommand('cd ..');
    inputRef.current?.focus();
  };

  const resetToHome = () => {
    executeCommand('cd ~');
    inputRef.current?.focus();
  };

  const presets = [
    'git status',
    'git pull',
    'ls -lah',
    'pwd',
    'php -v',
    'composer --version',
    'node -v',
    'npm -v',
  ];

  const quickJumpDirs = [
    { label: '~ Home', path: '~' },
    { label: 'public_html', path: '~/public_html' },
    { label: 'projects', path: '~/projects' },
  ];

  const pathSegments = currentCwd ? currentCwd.split('/').filter(Boolean) : [];

  return (
    <div className="space-y-4 animate-fade-in" onClick={focusInput}>
      {/* Preset & Quick Navigation Toolbar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-white/10 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-status-amber" />
            <span>Preset:</span>
          </span>
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={(e) => {
                e.stopPropagation();
                setCommand(preset);
                executeCommand(preset);
                inputRef.current?.focus();
              }}
              disabled={running}
              className="px-2.5 py-1 text-xs font-mono bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-white/5 hover:border-white/20 interactive-tap disabled:opacity-50 transition-all"
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetToHome();
            }}
            disabled={running || !currentCwd}
            title="Reset ke direktori Home (~)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 rounded-xl border border-white/10 interactive-tap transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cobalt-400" />
            <span>cd ~</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setHistory([]);
              inputRef.current?.focus();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 interactive-tap transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-status-rose" />
            <span>Bersihkan Layar</span>
          </button>
        </div>
      </div>

      {/* Terminal Console Box */}
      <div
        className={`bg-[#0c0d10] border rounded-2xl overflow-hidden flex flex-col h-[72vh] shadow-2xl backdrop-blur-md transition-all cursor-text ${
          isFocused ? 'border-cobalt-500/40 ring-1 ring-cobalt-500/20' : 'border-white/10'
        }`}
        onClick={focusInput}
      >
        {/* Console Header Bar */}
        <div className="px-4 py-3 bg-zinc-950/90 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 select-none">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600 shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600 shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600 shadow-sm" />
            </div>
            <span className="text-xs font-mono text-zinc-300 flex items-center gap-2 ml-1">
              <TerminalIcon className="w-3.5 h-3.5 text-status-emerald" />
              <span className="font-semibold text-white">
                shell@{typeof window !== 'undefined' ? window.location.hostname : 'server'}:
                <span className="text-cobalt-400">~{currentCwd ? '/' + currentCwd : ''}</span>$
              </span>
              <span className="text-zinc-500 text-[11px] hidden md:inline">(Safe Shell)</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tab Autocomplete
            </span>
            <span className="hidden sm:inline">Tekan Tab untuk saran folder • Ctrl+L Bersihkan</span>
          </div>
        </div>

        {/* Interactive Working Directory Bar / Breadcrumbs */}
        <div className="px-4 py-2 bg-zinc-900/60 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap select-none">
          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto py-0.5">
            <span className="text-zinc-500 flex items-center gap-1 mr-1">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400/80" />
              <span className="hidden sm:inline">Lokasi:</span>
            </span>

            {/* Home Root Crumb */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateToCrumb(-1, pathSegments);
              }}
              disabled={running}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors cursor-pointer ${
                pathSegments.length === 0
                  ? 'bg-cobalt-500/20 text-cobalt-300 font-semibold border border-cobalt-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-3 h-3" />
              <span>~</span>
            </button>

            {pathSegments.map((seg, idx) => {
              const isLast = idx === pathSegments.length - 1;
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-zinc-600" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToCrumb(idx, pathSegments);
                    }}
                    disabled={running}
                    className={`px-2 py-0.5 rounded-md text-xs transition-colors cursor-pointer ${
                      isLast
                        ? 'bg-cobalt-500/20 text-cobalt-300 font-semibold border border-cobalt-500/30'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {seg}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Jump Shortcuts */}
          <div className="flex items-center gap-1.5">
            {currentCwd && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateUp();
                }}
                disabled={running}
                title="Naik satu tingkat (cd ..)"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-md border border-white/5 interactive-tap transition-all cursor-pointer"
              >
                <ArrowUp className="w-3 h-3 text-amber-400" />
                <span>cd ..</span>
              </button>
            )}

            {quickJumpDirs.map((dir) => (
              <button
                key={dir.path}
                onClick={(e) => {
                  e.stopPropagation();
                  executeCommand(`cd ${dir.path}`);
                  inputRef.current?.focus();
                }}
                disabled={running}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-md border border-white/5 interactive-tap transition-all cursor-pointer"
              >
                <Folder className="w-3 h-3 text-cobalt-400" />
                <span>{dir.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Output Screen */}
        <div
          className="flex-1 p-4 sm:p-5 overflow-y-auto font-mono text-xs space-y-4"
          onClick={focusInput}
        >
          {history.length === 0 ? (
            <div className="text-zinc-500 leading-relaxed space-y-2.5 py-4">
              <p className="text-zinc-300 font-semibold text-sm">Selamat datang di Musend Deck Web Console.</p>
              <p className="text-xs text-zinc-400">
                Terminal kini interaktif penuh dengan <span className="text-status-emerald font-semibold">Tab Autocomplete</span>: ketik <span className="text-cobalt-300 font-mono">cd p</span> lalu tekan <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-zinc-200 border border-white/10">Tab</kbd> untuk otomatis melengkapi nama folder.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] text-zinc-500 flex-wrap">
                <span className="text-zinc-400 font-medium">Contoh:</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    executeCommand('cd projects && ls -lah');
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-colors cursor-pointer"
                >
                  cd projects && ls -lah
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    executeCommand('pwd');
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-colors cursor-pointer"
                >
                  pwd
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    executeCommand('git status');
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-colors cursor-pointer"
                >
                  git status
                </button>
              </div>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between text-zinc-400 text-[11px] border-b border-white/5 pb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-mono flex-wrap">
                    <span className="text-cobalt-400 font-semibold">
                      ~{item.cwd ? '/' + item.cwd : ''}
                    </span>
                    <span className="text-status-emerald font-bold">$</span>
                    <span className="text-zinc-100 font-semibold">{item.command}</span>
                  </div>
                  <div className="flex items-center gap-2.5 tabular-nums">
                    <span>{item.timestamp}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${
                        item.exitCode === 0
                          ? 'bg-status-emerald/10 border-status-emerald/30 text-status-emerald'
                          : 'bg-status-rose/10 border-status-rose/30 text-status-rose'
                      }`}
                    >
                      exit {item.exitCode}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyOutput(item.id, item.output);
                      }}
                      className="p-1 text-zinc-500 hover:text-zinc-200 rounded transition-colors"
                      title="Salin Output"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-status-emerald" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-xs pt-1 leading-relaxed overflow-x-auto select-text">
                  {item.output}
                </pre>
              </div>
            ))
          )}
          <div ref={outputEndRef} />
        </div>

        {/* Tab Autocomplete Suggestions Bar */}
        {suggestions.length > 0 && (
          <div className="px-4 py-2.5 bg-zinc-950 border-t border-white/10 flex items-center gap-2 overflow-x-auto select-none animate-fade-in text-xs font-mono">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 mr-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-status-amber" />
              <span>Pilihan ({suggestions.length}):</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {suggestions.map((s, idx) => {
                const isSelected = idx === activeSuggestionIndex;
                return (
                  <button
                    key={s.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newCmd = suggestionPrefix + s.value;
                      setCommand(newCmd);
                      setSuggestions([]);
                      setActiveSuggestionIndex(-1);
                      inputRef.current?.focus();
                    }}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border text-xs ${
                      isSelected
                        ? 'bg-cobalt-600 text-white border-cobalt-400 font-semibold shadow-sm'
                        : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/5 hover:border-white/20'
                    }`}
                  >
                    {s.is_dir ? (
                      <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                    ) : (
                      <FileText className="w-3 h-3 text-cobalt-400 shrink-0" />
                    )}
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[10px] text-zinc-500 ml-auto shrink-0 hidden md:inline">
              Tab: pilih berikutnya • Esc: tutup
            </span>
          </div>
        )}

        {/* Input Bar with Permanent Focus */}
        <div
          className="p-3 bg-zinc-950/95 border-t border-white/10 flex items-center gap-2 sm:gap-3 cursor-text"
          onClick={focusInput}
        >
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 select-none pl-1">
            <span
              className="text-cobalt-400 font-medium hidden sm:inline max-w-[120px] md:max-w-[200px] truncate"
              title={`~${currentCwd ? '/' + currentCwd : ''}`}
            >
              ~{currentCwd ? '/' + currentCwd : ''}
            </span>
            <span className="text-status-emerald font-bold text-sm">$</span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => {
              setCommand(e.target.value);
              if (suggestions.length > 0) {
                setSuggestions([]);
                setActiveSuggestionIndex(-1);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            readOnly={running}
            autoFocus
            placeholder={
              running
                ? 'Menjalankan perintah...'
                : `Ketik perintah bash di ~${currentCwd ? '/' + currentCwd : ''}... (Tekan Tab untuk autocomplete)`
            }
            className={`flex-1 bg-transparent border-none text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none ${
              running ? 'opacity-60 cursor-wait' : ''
            }`}
          />

          {completing && <Loader2 className="w-3.5 h-3.5 animate-spin text-cobalt-400 mr-1" />}

          <button
            onClick={(e) => {
              e.stopPropagation();
              executeCommand();
            }}
            disabled={running || !command.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-medium bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl interactive-tap shadow-sm transition-all cursor-pointer"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CornerDownLeft className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Jalankan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
