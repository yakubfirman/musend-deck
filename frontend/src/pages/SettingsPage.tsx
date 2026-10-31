import React, { useState } from 'react';
import { KeyRound, Shield, Check, AlertCircle, Loader2, Info, Server, Cpu, Database, HardDrive } from 'lucide-react';
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
    <div className="space-y-6 max-w-4xl animate-fade-in">
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
