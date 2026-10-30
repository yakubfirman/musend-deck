import { useState, useEffect, useRef } from 'react';
import { RefreshCw, FileText, Copy, Check, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { LogData } from '../../types';

export const LogViewer: React.FC = () => {
  const [logType, setLogType] = useState<string>('error');
  const [lines, setLines] = useState<number>(100);
  const [logData, setLogData] = useState<LogData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
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

  return (
    <div className="space-y-4">
      {/* Log Controls */}
      <div className="bg-canvas-surface border border-hairline rounded-lg p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Log Type Buttons */}
          <div className="flex rounded-md border border-hairline overflow-hidden p-0.5 bg-canvas-base">
            <button
              onClick={() => setLogType('error')}
              className={`px-3 py-1.5 text-xs font-mono rounded ${
                logType === 'error'
                  ? 'bg-zinc-800 text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              PHP Error Log
            </button>
            <button
              onClick={() => setLogType('access')}
              className={`px-3 py-1.5 text-xs font-mono rounded ${
                logType === 'access'
                  ? 'bg-zinc-800 text-white font-medium'
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
            className="bg-canvas-base border border-hairline rounded-md px-2.5 py-1.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cobalt-600"
          >
            <option value={100}>100 Baris Terakhir</option>
            <option value={250}>250 Baris Terakhir</option>
            <option value={500}>500 Baris Terakhir</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-cobalt-600 focus:ring-0 cursor-pointer"
            />
            <span>Auto Refresh (10s)</span>
          </label>

          <button
            onClick={handleCopy}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded border border-hairline interactive-tap"
            title="Salin Log"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-status-emerald" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={fetchLog}
            disabled={loading}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 rounded border border-hairline interactive-tap"
            title="Segarkan Log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Log Output Viewer */}
      <div className="bg-[#0c0d0e] border border-hairline rounded-lg overflow-hidden flex flex-col h-[65vh]">
        <div className="px-4 py-2 bg-canvas-elevated border-b border-hairline flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-3.5 h-3.5 text-status-amber flex-shrink-0" />
            <span className="truncate">{logData?.file || 'Mencari log...'}</span>
          </div>
          <span className="tabular-nums text-zinc-500 text-[11px] flex-shrink-0">
            {logData?.line_count || 0} baris dimuat
          </span>
        </div>

        <div className="flex-1 p-4 overflow-auto font-mono text-xs space-y-1">
          {loading && !logData ? (
            <div className="flex items-center justify-center h-full text-zinc-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cobalt-500" />
              <span>Membaca byte log...</span>
            </div>
          ) : logData?.lines?.length === 0 ? (
            <div className="text-zinc-500">Log kosong atau belum ada entri baru.</div>
          ) : (
            logData?.lines?.map((line, idx) => (
              <div key={idx} className="flex gap-3 hover:bg-white/[0.02] py-0.5">
                <span className="text-zinc-600 select-none w-8 text-right tabular-nums flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-zinc-300 break-all whitespace-pre-wrap">{line}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
