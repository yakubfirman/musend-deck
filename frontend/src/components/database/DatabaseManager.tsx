import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { DatabaseOverview } from '../../types';
import {
  Database,
  HardDrive,
  Download,
  Trash2,
  RefreshCw,
  Table,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Clock,
  Layers,
  ShieldCheck,
  Plus
} from 'lucide-react';

export const DatabaseManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<DatabaseOverview>({
    queryKey: ['databaseOverview'],
    queryFn: () => api.fetchDatabaseOverview(),
    refetchInterval: 30000,
  });

  // Backup mutation
  const backupMutation = useMutation({
    mutationFn: (type: string) => api.createDbBackup(type),
    onSuccess: (res) => {
      setBackupMsg(res.message || 'Backup database berhasil dibuat!');
      queryClient.invalidateQueries({ queryKey: ['databaseOverview'] });
      setTimeout(() => setBackupMsg(null), 4000);
    },
    onError: (err: any) => {
      alert(`Gagal membuat backup: ${err.message || err}`);
    },
  });

  // Delete backup mutation
  const deleteMutation = useMutation({
    mutationFn: (filename: string) => api.deleteDbBackup(filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databaseOverview'] });
    },
    onError: (err: any) => {
      alert(`Gagal menghapus file backup: ${err.message || err}`);
    },
  });

  const pg = data?.postgresql;
  const backups = data?.backups || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cobalt-600/10 border border-cobalt-500/20 text-cobalt-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Database Inspector & Backup</h2>
              <span className="text-[10px] font-mono bg-status-emerald/10 text-status-emerald border border-status-emerald/25 px-2 py-0.5 rounded-full">
                PostgreSQL & MySQL
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Kelola storage relasional, inspeksi tabel aplikasi, dan ekspor 1-klik dump terkompresi (.sql.gz)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Segarkan Database"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cobalt-400' : ''}`} />
          </button>

          <button
            onClick={() => backupMutation.mutate('postgresql')}
            disabled={backupMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-glow-cobalt transition-all disabled:opacity-50"
          >
            {backupMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>1-Click Backup PostgreSQL</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {backupMsg && (
        <div className="p-3.5 rounded-xl bg-status-emerald/10 border border-status-emerald/30 text-status-emerald text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{backupMsg}</span>
        </div>
      )}

      {/* Primary Database Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* PostgreSQL Database Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4 hover:border-cobalt-500/30 transition-all md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cobalt-500/10 text-cobalt-400 border border-cobalt-500/20">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <span>{pg?.database || 'yakubfir_api'}</span>
                  {pg?.connected ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-status-emerald/10 text-status-emerald border border-status-emerald/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-emerald animate-ping" />
                      Live Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Disconnected
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono">
                  PostgreSQL 15+ (Laravel Primary DB)
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-sm font-bold text-white">{pg?.formatted_size || '0 B'}</div>
              <div className="text-[10px] text-zinc-400">{pg?.table_count || 0} Tabel Publik</div>
            </div>
          </div>

          {/* Connection Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-black/40 p-3 rounded-xl border border-white/5">
            <div>
              <div className="text-[10px] text-zinc-500">Host</div>
              <div className="text-zinc-200 font-semibold">{pg?.host || '127.0.0.1'}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">Port</div>
              <div className="text-zinc-200 font-semibold">{pg?.port || 5432}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">User DB</div>
              <div className="text-zinc-200 font-semibold">{pg?.username || 'yakubfir_apiuser'}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">Koneksi Driver</div>
              <div className="text-cobalt-300 font-semibold">PDO pgsql</div>
            </div>
          </div>

          {/* Tables Inspector */}
          <div>
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-cobalt-400" />
              <span>Daftar Tabel ({pg?.tables?.length || 0})</span>
            </div>

            <div className="overflow-x-auto max-h-64 rounded-xl border border-white/10 bg-black/30">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-white/5 text-zinc-400 border-b border-white/10 sticky top-0 backdrop-blur-sm">
                  <tr>
                    <th className="py-2.5 px-3">Nama Tabel</th>
                    <th className="py-2.5 px-3 text-right">Perkiraan Baris</th>
                    <th className="py-2.5 px-3 text-right">Ukuran Disk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pg?.tables?.map((tbl) => (
                    <tr key={tbl.name} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 text-zinc-200 font-medium flex items-center gap-2">
                        <Layers className="w-3 h-3 text-zinc-500" />
                        <span>{tbl.name}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-zinc-400">
                        {tbl.rows_estimate.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-cobalt-300 font-semibold">
                        {tbl.formatted_size}
                      </td>
                    </tr>
                  ))}
                  {(!pg?.tables || pg.tables.length === 0) && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-zinc-500">
                        Tidak ada tabel ditemukan di skema publik.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Backup Archives Card */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-cobalt-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-white">Arsip Backup</h3>
              </div>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-zinc-400">
                {backups.length} File
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mb-3">
              File tersimpan di direktori <code className="text-zinc-300">~/backups/db/</code>
            </p>

            <div className="space-y-2.5 overflow-y-auto max-h-80 pr-1">
              {backups.map((bk) => (
                <div
                  key={bk.filename}
                  className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2 text-xs font-mono hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200 font-medium truncate max-w-[160px]" title={bk.filename}>
                      {bk.filename}
                    </span>
                    <span className="text-status-emerald font-semibold text-[11px]">
                      {bk.formatted_size}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                    <span>{bk.formatted_date}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={api.getDbDownloadUrl(bk.filename)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Unduh Backup"
                      >
                        <Download className="w-3.5 h-3.5 text-cobalt-400" />
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`Yakin hapus arsip ${bk.filename}?`)) {
                            deleteMutation.mutate(bk.filename);
                          }
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-white/10 rounded transition-colors"
                        title="Hapus File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {backups.length === 0 && (
                <div className="text-center py-10 text-zinc-500 text-xs font-mono">
                  Belum ada file backup. Klik tombol di atas untuk membuat snapshot pertama.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
