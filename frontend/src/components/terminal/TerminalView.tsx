import { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Trash2, Loader2, CornerDownLeft, Sparkles, Check, Copy } from 'lucide-react';
import { api } from '../../services/api';

interface HistoryItem {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: string;
}

export const TerminalView: React.FC = () => {
  const [command, setCommand] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [running, setRunning] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const executeCommand = async (cmdToRun = command) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed || running) return;

    setRunning(true);
    saveCommandToHistory(trimmed);
    setHistoryIndex(-1);

    const timeStr = new Date().toLocaleTimeString();

    try {
      const res = await api.runTerminal(trimmed);
      setHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          output: res.output || '(No output returned)',
          exitCode: res.exit_code ?? 0,
          timestamp: timeStr,
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

  const presets = [
    'git status',
    'git pull',
    'php -v',
    'composer --version',
    'node -v',
    'npm -v',
    'ls -lah',
    'pwd',
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Preset Toolbar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-white/10 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-status-amber" />
            <span>Preset Pintas:</span>
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

        <button
          onClick={() => setHistory([])}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 interactive-tap self-start md:self-auto transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 text-status-rose" />
          <span>Bersihkan Layar</span>
        </button>
      </div>

      {/* Terminal Console Box */}
      <div className="bg-[#0c0d10] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[65vh] shadow-2xl backdrop-blur-md">
        {/* Console Header Bar */}
        <div className="px-4 py-3 bg-zinc-950/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600 shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600 shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600 shadow-sm" />
            </div>
            <span className="text-xs font-mono text-zinc-300 flex items-center gap-2 ml-1">
              <TerminalIcon className="w-3.5 h-3.5 text-status-emerald" />
              <span className="font-semibold text-white">
                shell@{typeof window !== 'undefined' ? window.location.hostname : 'server'}:~$
              </span>
              <span className="text-zinc-500 text-[11px]">(CageFS Safe Mode)</span>
            </span>
          </div>

          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline-block">
            Batas timeout 10 detik • Non-interactive
          </span>
        </div>

        {/* Output Screen */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto font-mono text-xs space-y-4">
          {history.length === 0 ? (
            <div className="text-zinc-500 leading-relaxed space-y-2 py-4">
              <p className="text-zinc-300 font-semibold">Selamat datang di ServerDeck Web Console.</p>
              <p className="text-xs">
                Eksekusi perintah bash di bawah atau gunakan preset di atas. Perintah dijalankan secara aman di dalam jail CageFS akun Anda.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] text-zinc-500">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-400">git status</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-400">php -v</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-400">ls -la</span>
              </div>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] border-b border-white/5 pb-1.5">
                  <div className="flex items-center gap-2 font-mono">
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
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-status-emerald" /> : <Copy className="w-3.5 h-3.5" />}
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
        <div className="p-3 bg-zinc-950/90 border-t border-white/10 flex items-center gap-3">
          <span className="font-mono text-status-emerald font-bold text-sm pl-2">$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            placeholder={running ? 'Menjalankan perintah...' : 'Ketik perintah bash... (Tekan Enter)'}
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
