import { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, FileText, Copy, Check, Loader2, Search, Filter } from 'lucide-react';
import { api } from '../../services/api';
import { LogData } from '../../types';

export const LogViewer: React.FC = () => {
  const [logType, setLogType] = useState<string>('error');
  const [lines, setLines] = useState<number>(100);
  const [logData, setLogData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchLog = async () => {
    setLoading(true);
    try {
      const data = await api.fetchLogs(logType, lines);
      setLogData(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();
  }, [logType, lines]);

  // Auto-refresh interval (10s), paused if tab is hidden
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        api.fetchLogs(logType, lines).then(setLogData).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, logType, lines]);

  const handleCopy = () => {
    if (!logData?.lines) return;
    navigator.clipboard.writeText(logData.lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLines = useMemo(() => {
    if (!logData?.lines) return [];
    if (!filterQuery.trim()) return logData.lines;
    const q = filterQuery.toLowerCase();
    return logData.lines.filter((l) => l.toLowerCase().includes(q));
  }, [logData, filterQuery]);

  const getLineClass = (line: string) => {
    const l = line.toLowerCase();
    if (l.includes('fatal') || l.includes('error') || l.includes('exception') || l.includes(' 500 ')) {
      return 'text-rose-400 bg-rose-500/5';
    }
    if (l.includes('warn') || l.includes('notice') || l.includes('deprecated') || l.includes(' 404 ')) {
      return 'text-amber-300 bg-amber-500/5';
    }
    if (l.includes(' 200 ') || l.includes('success')) {
      return 'text-emerald-300';
    }
    return 'text-zinc-300';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Log Controls */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Log Type Buttons */}
          <div className="flex rounded-xl border border-white/10 p-1 bg-black/40">
            <button
              onClick={() => setLogType('error')}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                logType === 'error'
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              PHP Error Log
            </button>
            <button
              onClick={() => setLogType('access')}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                logType === 'access'
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              SSL Access Log
            </button>
          </div>

          {/* Line Count */}
          <select
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cobalt-500 transition-colors"
          >
            <option value={100}>100 Baris</option>
            <option value={250}>250 Baris</option>
            <option value={500}>500 Baris</option>
          </select>

          {/* Filter Search */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter log..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cobalt-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-cobalt-600 focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              {autoRefresh && <span className="w-2 h-2 rounded-full bg-status-emerald animate-pulse" />}
              <span>Auto Refresh (10s)</span>
            </span>
          </label>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 interactive-tap transition-all"
            title="Salin Semua Log"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-status-emerald" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin'}</span>
          </button>

          <button
            onClick={fetchLog}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 interactive-tap transition-all"
            title="Segarkan Log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cobalt-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Log Output Viewer */}
      <div className="bg-[#0c0d10] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[65vh] shadow-2xl backdrop-blur-md">
        <div className="px-4 py-3 bg-zinc-950/80 border-b border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-3.5 h-3.5 text-status-amber flex-shrink-0" />
            <span className="truncate text-zinc-300">{logData?.file || 'Mencari file log...'}</span>
          </div>
          <span className="tabular-nums text-zinc-500 text-[11px] flex-shrink-0 bg-white/5 px-2 py-0.5 rounded border border-white/5">
            {filteredLines.length} baris ditampilkan
          </span>
        </div>

        <div className="flex-1 p-4 overflow-auto font-mono text-xs space-y-1">
          {loading && !logData ? (
            <div className="flex items-center justify-center h-full text-zinc-500 gap-2 font-mono text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-cobalt-500" />
              <span>Membaca byte log dari disk...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="text-zinc-500 font-mono text-xs py-8 text-center">
              {filterQuery ? 'Tidak ada baris yang cocok dengan filter.' : 'Log kosong atau belum ada entri baru.'}
            </div>
          ) : (
            filteredLines.map((line, idx) => (
              <div key={idx} className={`flex gap-3 px-2 py-0.5 rounded transition-colors ${getLineClass(line)}`}>
                <span className="text-zinc-600 select-none w-9 text-right tabular-nums flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="break-all whitespace-pre-wrap leading-relaxed">{line}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
