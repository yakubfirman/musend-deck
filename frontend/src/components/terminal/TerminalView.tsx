import { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Trash2, Loader2, CornerDownLeft } from 'lucide-react';
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
      const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIndex);
      setCommand(commandHistory[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[nextIndex] || '');
      }
    }
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
    <div className="space-y-4">
      {/* Preset Toolbar */}
      <div className="bg-canvas-surface border border-hairline rounded-lg p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-zinc-500 mr-1">Preset:</span>
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setCommand(preset);
                executeCommand(preset);
              }}
              disabled={running}
              className="px-2.5 py-1 text-xs font-mono bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded border border-white/5 interactive-tap disabled:opacity-50"
            >
              {preset}
            </button>
          ))}
        </div>

        <button
          onClick={() => setHistory([])}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-800/40 hover:bg-zinc-800 rounded border border-hairline interactive-tap self-start md:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Bersihkan Layar</span>
        </button>
      </div>

      {/* Terminal Console Box */}
      <div className="bg-[#0c0d0e] border border-hairline rounded-lg overflow-hidden flex flex-col h-[65vh]">
        {/* Console Header Bar */}
        <div className="px-4 py-2.5 bg-canvas-elevated border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 ml-2">
              <TerminalIcon className="w-3.5 h-3.5 text-status-emerald" />
              <span>Web Console (CloudLinux CageFS)</span>
            </span>
          </div>

          <span className="text-[11px] font-mono text-zinc-500">
            Maks timeout 10s • Non-interactive
          </span>
        </div>

        {/* Output Screen */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-4">
          {history.length === 0 ? (
            <div className="text-zinc-500 leading-relaxed">
              Selamat datang di ServerDeck Web Console.
              <br />
              Ketik perintah bash di bawah atau gunakan preset di atas.
              <br />
              Contoh: <span className="text-zinc-400">git status</span>, <span className="text-zinc-400">php -v</span>, <span className="text-zinc-400">composer install</span>.
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] border-b border-white/5 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-status-emerald font-semibold">$</span>
                    <span className="text-zinc-200 font-semibold">{item.command}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span>{item.timestamp}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        item.exitCode === 0
                          ? 'bg-status-emerald/10 text-status-emerald'
                          : 'bg-status-rose/10 text-status-rose'
                      }`}
                    >
                      exit {item.exitCode}
                    </span>
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
        <div className="p-3 bg-canvas-elevated border-t border-hairline flex items-center gap-2">
          <span className="font-mono text-status-emerald font-semibold text-sm pl-1">$</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-cobalt-600 hover:bg-cobalt-500 disabled:opacity-50 text-white rounded interactive-tap"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CornerDownLeft className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Jalankan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
