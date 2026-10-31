import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { CronJobItem } from '../../types';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  X,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const PRESET_EXPRESSIONS = [
  { label: 'Setiap Menit', expr: '* * * * *' },
  { label: 'Setiap 5 Menit', expr: '*/5 * * * *' },
  { label: 'Setiap 15 Menit', expr: '*/15 * * * *' },
  { label: 'Setiap 30 Menit', expr: '*/30 * * * *' },
  { label: 'Setiap Jam', expr: '0 * * * *' },
  { label: 'Setiap Hari 00:00', expr: '0 0 * * *' },
  { label: 'Setiap Minggu', expr: '0 0 * * 0' },
];

export const CronJobManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [addMode, setAddMode] = useState<boolean>(false);
  const [newExpr, setNewExpr] = useState<string>('*/30 * * * *');
  const [newCmd, setNewCmd] = useState<string>('');
  const [newComment, setNewComment] = useState<string>('');
  const [testOutput, setTestOutput] = useState<{ output: string; exit_code: number; duration_ms: number } | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ jobs: CronJobItem[]; count: number }>({
    queryKey: ['cronJobs'],
    queryFn: () => api.fetchCronJobs(),
    refetchInterval: 30000,
  });

  const addMutation = useMutation({
    mutationFn: () => api.addCronJob(newExpr, newCmd, newComment),
    onSuccess: () => {
      setAddMode(false);
      setNewCmd('');
      setNewComment('');
      setNewExpr('*/30 * * * *');
      setSuccessMsg('Cron job berhasil ditambahkan!');
      setTimeout(() => setSuccessMsg(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['cronJobs'] });
    },
    onError: (err: any) => alert(`Gagal menambah cron job: ${err.message}`),
  });

  const toggleMutation = useMutation({
    mutationFn: (idx: number) => api.toggleCronJob(idx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronJobs'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (idx: number) => api.deleteCronJob(idx),
    onSuccess: () => {
      setSuccessMsg('Cron job berhasil dihapus.');
      setTimeout(() => setSuccessMsg(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['cronJobs'] });
    },
    onError: (err: any) => alert(`Gagal hapus: ${err.message}`),
  });

  const testMutation = useMutation({
    mutationFn: (cmd: string) => api.testRunCron(cmd),
    onSuccess: (res) => {
      setTestOutput({ output: res.output, exit_code: res.exit_code, duration_ms: res.duration_ms });
    },
    onError: (err: any) => alert(`Gagal menjalankan test: ${err.message}`),
  });

  const jobs = data?.jobs || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cobalt-600/10 border border-cobalt-500/20 text-cobalt-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Cron Job Manager</h2>
              <span className="text-[10px] font-mono bg-white/5 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-full">
                {data?.count || 0} Job Aktif
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Kelola jadwal otomasi hosting via <code className="text-zinc-300">crontab</code> — tambah, nonaktifkan, hapus & uji coba
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cobalt-400' : ''}`} />
          </button>

          <button
            onClick={() => setAddMode(!addMode)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-glow-cobalt transition-all"
          >
            {addMode ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{addMode ? 'Batal' : 'Tambah Cron Job'}</span>
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-status-emerald/10 border border-status-emerald/30 text-status-emerald text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add New Cron Job Form */}
      {addMode && (
        <div className="glass-card rounded-2xl p-5 border border-cobalt-500/30 space-y-4 animate-in slide-in-from-top duration-200">
          <h3 className="font-semibold text-sm text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-cobalt-400" />
            <span>Tambah Jadwal Cron Baru</span>
          </h3>

          {/* Preset Buttons */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-2">Preset Jadwal</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_EXPRESSIONS.map((p) => (
                <button
                  key={p.expr}
                  onClick={() => setNewExpr(p.expr)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
                    newExpr === p.expr
                      ? 'bg-cobalt-600 text-white border-cobalt-500 font-semibold'
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Ekspresi Cron (5 field)</label>
              <input
                type="text"
                value={newExpr}
                onChange={(e) => setNewExpr(e.target.value)}
                placeholder="*/30 * * * *"
                className="w-full bg-black/50 border border-white/20 text-zinc-100 font-mono text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-cobalt-500 focus:ring-1 focus:ring-cobalt-500/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Komentar (opsional)</label>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Backup mingguan"
                className="w-full bg-black/50 border border-white/20 text-zinc-100 font-mono text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-cobalt-500 focus:ring-1 focus:ring-cobalt-500/30 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">Perintah (command)</label>
            <input
              type="text"
              value={newCmd}
              onChange={(e) => setNewCmd(e.target.value)}
              placeholder="/home/yakubfir/bin/deploy-all > /dev/null 2>&1"
              className="w-full bg-black/50 border border-white/20 text-zinc-100 font-mono text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-cobalt-500 focus:ring-1 focus:ring-cobalt-500/30 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              onClick={() => {
                if (newCmd.trim()) testMutation.mutate(newCmd);
              }}
              disabled={!newCmd.trim() || testMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-mono border border-white/10 transition-colors disabled:opacity-40"
            >
              {testMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Test Jalankan Sekarang</span>
            </button>

            <button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !newExpr.trim() || !newCmd.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
            >
              {addMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Simpan Cron Job</span>
            </button>
          </div>

          {/* Test Run Output */}
          {testOutput && (
            <div className="mt-2 bg-black/70 rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Terminal className="w-3.5 h-3.5 text-cobalt-400" />
                  <span className={`font-semibold ${testOutput.exit_code === 0 ? 'text-status-emerald' : 'text-rose-400'}`}>
                    Exit Code: {testOutput.exit_code} ({testOutput.duration_ms}ms)
                  </span>
                </div>
                <button onClick={() => setTestOutput(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="p-3 text-zinc-200 font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
                {testOutput.output || '(tidak ada output)'}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Cron Jobs List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cobalt-400" />
          <span className="text-xs font-mono text-zinc-400">Membaca crontab dari server...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 glass-card rounded-2xl border border-white/10">
          <Clock className="w-8 h-8 text-zinc-600" />
          <div className="text-center font-mono text-xs text-zinc-500">
            <p className="font-medium text-zinc-400 mb-1">Tidak ada cron job terdaftar</p>
            <p>Klik "Tambah Cron Job" untuk membuat jadwal otomasi pertama</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, idx) => (
            <div
              key={`${job.line_index}-${idx}`}
              className={`glass-card rounded-2xl border transition-all ${
                job.enabled ? 'border-white/10 hover:border-cobalt-500/30' : 'border-white/5 opacity-60'
              }`}
            >
              {/* Job Row */}
              <div className="flex items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => toggleMutation.mutate(idx)}
                    disabled={toggleMutation.isPending}
                    className="flex-shrink-0 transition-colors"
                    title={job.enabled ? 'Nonaktifkan job ini' : 'Aktifkan job ini'}
                  >
                    {job.enabled ? (
                      <ToggleRight className="w-5 h-5 text-status-emerald" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-zinc-500" />
                    )}
                  </button>

                  <div className="min-w-0">
                    {job.comment && (
                      <p className="text-[10px] font-mono text-zinc-500 mb-1 truncate">
                        # {job.comment}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-cobalt-500/10 text-cobalt-300 border border-cobalt-500/20 font-semibold flex-shrink-0">
                        {job.expression}
                      </span>
                      <span className="text-zinc-300 truncate max-w-xs" title={job.command}>
                        {job.command}
                      </span>
                    </div>

                    <p className="text-[10px] font-mono text-zinc-500 mt-1">{job.human}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Uji Jalankan"
                  >
                    {expandedIdx === idx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => testMutation.mutate(job.command)}
                    disabled={testMutation.isPending}
                    className="p-1.5 text-zinc-400 hover:text-cobalt-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Uji Jalankan Sekarang"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Yakin hapus cron job ini?\n\n${job.expression} ${job.command}`)) {
                        deleteMutation.mutate(idx);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Hapus Cron Job"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded Test Output Panel */}
              {expandedIdx === idx && testOutput && (
                <div className="border-t border-white/10 bg-black/60 overflow-hidden">
                  <div className="px-4 py-2 bg-white/5 flex items-center gap-2 border-b border-white/5">
                    <Terminal className="w-3.5 h-3.5 text-cobalt-400" />
                    <span className="text-xs font-mono text-zinc-300">
                      Output Test Run — Exit {testOutput.exit_code} ({testOutput.duration_ms}ms)
                    </span>
                  </div>
                  <pre className="p-4 font-mono text-xs text-zinc-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {testOutput.output || '(tidak ada output)'}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
