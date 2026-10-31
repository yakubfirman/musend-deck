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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentCwd, setCurrentCwd] = useState<string>(() => {
    return localStorage.getItem('serverdeck_terminal_cwd') || '';
  });
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [history]);

  const executeCommand = async (cmdToRun = command, overrideCwd?: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed || running) return;

    saveCommandToHistory(trimmed);
    setHistoryIndex(-1);

    // Client-side clear screen
    if (trimmed === 'clear' || trimmed === 'cls') {
      setHistory([]);
      setCommand('');
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
        displayOutput = `(Direktori aktif diubah: ~${newCwd ? '/' + newCwd : ''})`;
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
      setCommand('');
      setRunning(false);
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
      setRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[nextIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
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
  };

  const navigateUp = () => {
    if (!currentCwd) return;
    executeCommand('cd ..');
  };

  const resetToHome = () => {
    executeCommand('cd ~');
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
    <div className="space-y-4 animate-fade-in">
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
              onClick={() => {
                setCommand(preset);
                executeCommand(preset);
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
            onClick={resetToHome}
            disabled={running || !currentCwd}
            title="Reset ke direktori Home (~)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 rounded-xl border border-white/10 interactive-tap transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cobalt-400" />
            <span>cd ~</span>
          </button>

          <button
            onClick={() => setHistory([])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 interactive-tap transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-status-rose" />
            <span>Bersihkan Layar</span>
          </button>
        </div>
      </div>

      {/* Terminal Console Box */}
      <div className="bg-[#0c0d10] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[70vh] shadow-2xl backdrop-blur-md">
        {/* Console Header Bar */}
        <div className="px-4 py-3 bg-zinc-950/90 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
              <span className="text-zinc-500 text-[11px] hidden md:inline">(CageFS Safe Mode)</span>
            </span>
          </div>

          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline-block">
            Timeout 15 detik • Direktori interaktif
          </span>
        </div>

        {/* Interactive Working Directory Bar / Breadcrumbs */}
        <div className="px-4 py-2 bg-zinc-900/60 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto py-0.5">
            <span className="text-zinc-500 flex items-center gap-1 mr-1">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400/80" />
              <span className="hidden sm:inline">Lokasi:</span>
            </span>

            {/* Home Root Crumb */}
            <button
              onClick={() => navigateToCrumb(-1, pathSegments)}
              disabled={running}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors ${
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
                    onClick={() => navigateToCrumb(idx, pathSegments)}
                    disabled={running}
                    className={`px-2 py-0.5 rounded-md text-xs transition-colors ${
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
                onClick={navigateUp}
                disabled={running}
                title="Naik satu tingkat (cd ..)"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-md border border-white/5 interactive-tap transition-all"
              >
                <ArrowUp className="w-3 h-3 text-amber-400" />
                <span>cd ..</span>
              </button>
            )}

            {quickJumpDirs.map((dir) => (
              <button
                key={dir.path}
                onClick={() => executeCommand(`cd ${dir.path}`)}
                disabled={running}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-md border border-white/5 interactive-tap transition-all"
              >
                <Folder className="w-3 h-3 text-cobalt-400" />
                <span>{dir.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Output Screen */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto font-mono text-xs space-y-4">
          {history.length === 0 ? (
            <div className="text-zinc-500 leading-relaxed space-y-2.5 py-4">
              <p className="text-zinc-300 font-semibold text-sm">Selamat datang di ServerDeck Web Console.</p>
              <p className="text-xs text-zinc-400">
                Kini terminal mendukung navigasi direktori penuh (<span className="text-cobalt-300 font-mono">cd folder</span>,{' '}
                <span className="text-cobalt-300 font-mono">cd ..</span>, <span className="text-cobalt-300 font-mono">cd ~</span>) dan direktori kerja tersimpan secara otomatis untuk setiap perintah selanjutnya.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] text-zinc-500 flex-wrap">
                <span className="text-zinc-400 font-medium">Contoh:</span>
                <button
                  onClick={() => executeCommand('cd projects && ls -lah')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-colors"
                >
                  cd projects && ls -lah
                </button>
                <button
                  onClick={() => executeCommand('pwd')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-colors"
                >
                  pwd
                </button>
                <button
                  onClick={() => executeCommand('git status')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-colors"
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
                      onClick={() => handleCopyOutput(item.id, item.output)}
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

                <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-xs pt-1 leading-relaxed overflow-x-auto">
                  {item.output}
                </pre>
              </div>
            ))
          )}
          <div ref={outputEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-zinc-950/95 border-t border-white/10 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 select-none pl-1">
            <span className="text-cobalt-400 font-medium hidden sm:inline max-w-[120px] md:max-w-[200px] truncate" title={`~${currentCwd ? '/' + currentCwd : ''}`}>
              ~{currentCwd ? '/' + currentCwd : ''}
            </span>
            <span className="text-status-emerald font-bold text-sm">$</span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            placeholder={running ? 'Menjalankan perintah...' : `Ketik perintah bash di ~${currentCwd ? '/' + currentCwd : ''}...`}
            className="flex-1 bg-transparent border-none text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />

          <button
            onClick={() => executeCommand()}
            disabled={running || !command.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-medium bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl interactive-tap shadow-sm transition-all"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CornerDownLeft className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Jalankan</span>
          </button>
        </div>
      </div>
    </div>
  );
};