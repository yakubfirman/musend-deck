import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  Shield,
  Check,
  AlertCircle,
  Loader2,
  Info,
  Server,
  Cpu,
  Database,
  HardDrive,
  Trash2,
  Sparkles,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { MetricsData } from '../types';

interface SettingsPageProps {
  metrics?: MetricsData;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ metrics }) => {
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const queryClient = useQueryClient();
  const [housekeepMsg, setHousekeepMsg] = useState<string | null>(null);

  // Housekeeping Query
  const {
    data: hkData,
    isLoading: hkLoading,
    refetch: refetchHk,
    isFetching: hkFetching,
  } = useQuery({
    queryKey: ['housekeepingStatus'],
    queryFn: () => api.fetchHousekeepingStatus(),
  });

  // Housekeeping Clean Mutation
  const cleanMutation = useMutation({
    mutationFn: () => api.runHousekeepingCleanup(),
    onSuccess: (res) => {
      setHousekeepMsg(res.message);
      queryClient.invalidateQueries({ queryKey: ['housekeepingStatus'] });
      setTimeout(() => setHousekeepMsg(null), 5000);
    },
    onError: (err: any) => {
      alert(`Gagal membersihkan aset: ${err.message || err}`);
    },
  });

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score; // 0 to 5
  };

  const strength = getPasswordStrength(newPassword);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;

    if (newPassword.length < 6) {
      setMessage({ text: 'Kata sandi baru minimal 6 karakter.', error: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Konfirmasi kata sandi tidak cocok.', error: true });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await api.changePassword(oldPassword, newPassword);
      setMessage({ text: res.message || 'Kata sandi berhasil diperbarui.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch (err: any) {
      setMessage({ text: err.message || 'Gagal mengubah kata sandi.', error: true });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Password Change Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-7 space-y-5 border border-white/10 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-xl bg-cobalt-500/10 border border-cobalt-500/20 text-cobalt-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Perbarui Kata Sandi Panel</h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Kelola kredensial akses untuk akun ServerDeck Anda.</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-mono flex items-center gap-2.5 border ${
              message.error
                ? 'bg-status-rose/10 border-status-rose/30 text-status-rose'
                : 'bg-status-emerald/10 border-status-emerald/30 text-status-emerald'
            }`}
          >
            {message.error ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">Kata Sandi Saat Ini</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
              Kata Sandi Baru (Min. 6 Karakter)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20 transition-all"
            />
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${strength >= 1 ? (strength <= 2 ? 'bg-status-rose w-1/3' : strength <= 4 ? 'bg-status-amber w-2/3' : 'bg-status-emerald w-full') : 'w-0'}`} />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>Kekuatan kata sandi</span>
                  <span>{strength <= 2 ? 'Lemah' : strength <= 4 ? 'Cukup Baik' : 'Sangat Kuat'}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">Ulangi Kata Sandi Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !oldPassword || !newPassword || !confirmPassword}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl interactive-tap shadow-sm transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
            <span>Simpan Kata Sandi</span>
          </button>
        </form>
      </div>

      {/* Housekeeping & Storage Clean Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-7 space-y-5 border border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">Housekeeping & Pembersihan Aset</h2>
                <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  Storage Optimizer
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Deteksi dan bersihkan bundle JavaScript/CSS usang dari kompilasi sebelumnya serta cache usang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetchHk()}
              disabled={hkFetching}
              className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              title="Periksa Ulang"
            >
              <RefreshCw className={`w-4 h-4 ${hkFetching ? 'animate-spin text-purple-400' : ''}`} />
            </button>

            <button
              onClick={() => cleanMutation.mutate()}
              disabled={cleanMutation.isPending || (hkData?.stale_assets_count === 0 && !hkLoading)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              {cleanMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Bersihkan Aset Usang</span>
            </button>
          </div>
        </div>

        {housekeepMsg && (
          <div className="p-3.5 rounded-xl bg-status-emerald/10 border border-status-emerald/30 text-status-emerald text-xs font-mono flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{housekeepMsg}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5">
            <div className="text-[10px] text-zinc-500 mb-1">File Aset Usang</div>
            <div className={`text-base font-bold ${hkData?.stale_assets_count ? 'text-status-amber' : 'text-status-emerald'}`}>
              {hkData?.stale_assets_count || 0} File
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              {hkData?.formatted_stale_size || '0 B'} dapat dibersihkan
            </div>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5">
            <div className="text-[10px] text-zinc-500 mb-1">Aset Aktif Produksi</div>
            <div className="text-base font-bold text-white">
              {hkData?.formatted_active_size || '0 B'}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Sedang digunakan index.html</div>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5">
            <div className="text-[10px] text-zinc-500 mb-1">Status Kebersihan</div>
            <div className={`text-base font-bold ${hkData?.stale_assets_count === 0 ? 'text-status-emerald' : 'text-zinc-300'}`}>
              {hkData?.stale_assets_count === 0 ? 'Optimal (Bersih)' : 'Perlu Dibersihkan'}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Folder assets/</div>
          </div>
        </div>

        {/* Stale Files List */}
        {hkData?.stale_assets && hkData.stale_assets.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
              Rincian File Usang Terdeteksi ({hkData.stale_assets.length}):
            </div>
            <div className="bg-black/30 rounded-xl border border-white/5 divide-y divide-white/5 max-h-40 overflow-y-auto font-mono text-xs">
              {hkData.stale_assets.map((asset) => (
                <div key={asset.name} className="p-2.5 px-3 flex items-center justify-between text-zinc-300 hover:bg-white/5 transition-colors">
                  <span className="truncate max-w-xs text-zinc-400">{asset.name}</span>
                  <span className="text-status-amber font-semibold text-[11px]">{asset.formatted_size}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hosting Environment Info Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-7 space-y-5 border border-white/10 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="p-2.5 rounded-xl bg-status-emerald/10 border border-status-emerald/20 text-status-emerald">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Informasi Lingkungan Hosting</h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Spesifikasi kuota CloudLinux CageFS & runtime server.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Akun Pengguna</span>
            <span className="text-white font-semibold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5">
              {metrics?.system?.user || 'musend'}
            </span>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Versi PHP</span>
            <span className="text-white font-semibold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5">
              PHP {metrics?.system?.php_version || '8.2+'}
            </span>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Sistem Operasi</span>
            <span className="text-white font-semibold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5">
              {metrics?.system?.os || 'CloudLinux / CageFS'}
            </span>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Waktu Server</span>
            <span className="text-white font-semibold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5 tabular-nums">
              {metrics?.system?.server_time || '-'}
            </span>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Batas Entry Processes (EP)</span>
            <span className="text-white font-semibold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5 tabular-nums">
              {metrics?.processes?.ep_limit || 60} EP
            </span>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Batas Jumlah Proses (NPROC)</span>
            <span className="text-white font-semibold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5 tabular-nums">
              {metrics?.processes?.nproc_limit || 400} NPROC
            </span>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Batas I/O Disk Speed</span>
            <span className="text-white font-semibold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5 tabular-nums">
              {metrics?.io?.speed_limit_mb || 32} MB/s
            </span>
          </div>

          <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
            <span className="text-zinc-400">Batas IOPS</span>
            <span className="text-white font-semibold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5 tabular-nums">
              {metrics?.io?.iops_limit || 4096} IOPS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
