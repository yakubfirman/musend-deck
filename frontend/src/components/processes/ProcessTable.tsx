import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Search, AlertTriangle, ShieldAlert, Loader2, X } from 'lucide-react';
import { api } from '../../services/api';
import { ProcessItem } from '../../types';

export const ProcessTable: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [killTarget, setKillTarget] = useState<ProcessItem | null>(null);
  const [signal, setSignal] = useState<number>(15);
  const [killing, setKilling] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const loadProcesses = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const data = await api.fetchProcesses();
      setProcesses(data);
      setLoading(false);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Gagal mengambil daftar proses', error: true });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  const filteredProcesses = useMemo(() => {
    if (!searchQuery.trim()) return processes;
    const q = searchQuery.toLowerCase();
    return processes.filter(
      (p) =>
        p.pid.toString().includes(q) ||
        p.comm.toLowerCase().includes(q) ||
        p.args.toLowerCase().includes(q)
    );
  }, [processes, searchQuery]);

  const handleKill = async () => {
    if (!killTarget) return;
    setKilling(true);
    try {
      const res = await api.killProcess(killTarget.pid, signal);
      setActionMessage({ text: res.message || `Proses PID ${killTarget.pid} dihentikan.` });
      setKillTarget(null);
      setKilling(false);
      loadProcesses();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Gagal menghentikan proses', error: true });
      setKilling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="bg-canvas-surface border border-hairline rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Total Proses:</span>
            <span className="text-xs font-mono font-semibold text-zinc-100 bg-zinc-800/80 px-2 py-0.5 rounded border border-white/5 tabular-nums">
              {processes.length}
            </span>
          </div>

          <button
            onClick={loadProcesses}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md border border-hairline interactive-tap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari PID atau nama proses..."
            className="w-full bg-canvas-base border border-hairline rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cobalt-600 font-mono"
          />
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-mono flex items-center justify-between border ${
            actionMessage.error
              ? 'bg-status-rose/10 border-status-rose/30 text-status-rose'
              : 'bg-status-emerald/10 border-status-emerald/30 text-status-emerald'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Process Table */}
      <div className="bg-canvas-surface border border-hairline rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-canvas-elevated border-b border-hairline text-zinc-400">
              <tr>
                <th className="py-2.5 px-3 w-20">PID</th>
                <th className="py-2.5 px-3 w-16">PPID</th>
                <th className="py-2.5 px-3 w-20 text-right">CPU %</th>
                <th className="py-2.5 px-3 w-20 text-right">MEM %</th>
                <th className="py-2.5 px-3 w-24">Waktu</th>
                <th className="py-2.5 px-3">Perintah</th>
                <th className="py-2.5 px-3 w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cobalt-500" />
                    <span>Mengambil daftar proses aktif...</span>
                  </td>
                </tr>
              ) : filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Tidak ada proses yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((proc) => (
                  <tr key={proc.pid} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-zinc-200 tabular-nums">
                      {proc.pid}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 tabular-nums">{proc.ppid}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span
                        className={
                          proc.cpu > 50
                            ? 'text-status-rose font-bold'
                            : proc.cpu > 10
                            ? 'text-status-amber'
                            : 'text-zinc-300'
                        }
                      >
                        {proc.cpu.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-zinc-300">
                      {proc.mem.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">{proc.time}</td>
                    <td className="py-2.5 px-3 max-w-md truncate" title={proc.args}>
                      <span className="text-zinc-200 font-semibold mr-1.5">{proc.comm}</span>
                      <span className="text-zinc-500">{proc.args.replace(proc.comm, '')}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setKillTarget(proc);
                          setSignal(15);
                        }}
                        className="px-2 py-1 text-xs text-status-rose hover:bg-status-rose/10 border border-status-rose/30 rounded interactive-tap"
                      >
                        Kill
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kill Confirmation Modal */}
      {killTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-canvas-surface border border-hairline rounded-lg w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2 text-status-rose">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-sm font-semibold">Hentikan Proses (Kill)</h3>
            </div>

            <p className="text-xs text-zinc-300 font-mono">
              PID: <strong className="text-white">{killTarget.pid}</strong> ({killTarget.comm})
              <br />
              <span className="text-zinc-500 text-[11px] block mt-1 truncate">{killTarget.args}</span>
            </p>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 block font-mono">Pilih Sinyal:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSignal(15)}
                  className={`p-2 rounded border text-left font-mono ${
                    signal === 15
                      ? 'border-cobalt-600 bg-cobalt-600/10 text-white'
                      : 'border-hairline text-zinc-400 hover:border-hairline-hover'
                  }`}
                >
                  <div className="font-semibold">SIGTERM (15)</div>
                  <div className="text-[10px] text-zinc-500">Permintaan berhenti rapi</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSignal(9)}
                  className={`p-2 rounded border text-left font-mono ${
                    signal === 9
                      ? 'border-status-rose bg-status-rose/10 text-white'
                      : 'border-hairline text-zinc-400 hover:border-hairline-hover'
                  }`}
                >
                  <div className="font-semibold text-status-rose">SIGKILL (9)</div>
                  <div className="text-[10px] text-zinc-500">Paksa henti seketika</div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setKillTarget(null)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleKill}
                disabled={killing}
                className="px-3 py-1.5 text-xs bg-status-rose hover:bg-status-rose/80 text-white rounded-md disabled:opacity-50"
              >
                {killing ? 'Menghentikan...' : 'Kirim Sinyal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
