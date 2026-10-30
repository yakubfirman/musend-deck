import React, { useState } from 'react';
import { KeyRound, Shield, Check, AlertCircle, Loader2, Info } from 'lucide-react';
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
    <div className="space-y-6 max-w-4xl">
      {/* Password Change Card */}
      <div className="bg-canvas-surface border border-hairline rounded-lg p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-hairline">
          <KeyRound className="w-4 h-4 text-cobalt-500" />
          <h2 className="text-sm font-semibold text-zinc-100">Perbarui Kata Sandi Panel</h2>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 border ${
              message.error
                ? 'bg-status-rose/10 border-status-rose/30 text-status-rose'
                : 'bg-status-emerald/10 border-status-emerald/30 text-status-emerald'
            }`}
          >
            {message.error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Kata Sandi Lama</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full bg-canvas-base border border-hairline rounded-md px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-600"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Kata Sandi Baru (Min. 6 Karakter)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-canvas-base border border-hairline rounded-md px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-600"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Ulangi Kata Sandi Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-canvas-base border border-hairline rounded-md px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cobalt-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !oldPassword || !newPassword || !confirmPassword}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-cobalt-600 hover:bg-cobalt-500 disabled:opacity-50 text-white rounded-md interactive-tap"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
            <span>Simpan Kata Sandi</span>
          </button>
        </form>
      </div>

      {/* Hosting Environment Info Card */}
      <div className="bg-canvas-surface border border-hairline rounded-lg p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-hairline">
          <Info className="w-4 h-4 text-status-emerald" />
          <h2 className="text-sm font-semibold text-zinc-100">Informasi Lingkungan Hosting</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-canvas-base rounded border border-hairline flex justify-between">
            <span className="text-zinc-500">Akun Pengguna</span>
            <span className="text-zinc-200 font-semibold">{metrics?.system?.user || 'yakubfir'}</span>
          </div>

          <div className="p-3 bg-canvas-base rounded border border-hairline flex justify-between">
            <span className="text-zinc-500">Versi PHP</span>
            <span className="text-zinc-200 font-semibold">{metrics?.system?.php_version || '8.2+'}</span>
          </div>

          <div className="p-3 bg-canvas-base rounded border border-hairline flex justify-between">
            <span className="text-zinc-500">Sistem Operasi</span>
            <span className="text-zinc-200 font-semibold">{metrics?.system?.os || 'CloudLinux / CageFS'}</span>
          </div>

          <div className="p-3 bg-canvas-base rounded border border-hairline flex justify-between">
            <span className="text-zinc-500">Waktu Server</span>
            <span className="text-zinc-200 font-semibold">{metrics?.system?.server_time || '-'}</span>
          </div>

          <div className="p-3 bg-canvas-base rounded border border-hairline flex justify-between">
            <span className="text-zinc-500">Batas Entry Processes (EP)</span>
            <span className="text-zinc-200 font-semibold">{metrics?.processes?.ep_limit || 60} EP</span>
          </div>

          <div className="p-3 bg-canvas-base rounded border border-hairline flex justify-between">
            <span className="text-zinc-500">Batas Jumlah Proses (NPROC)</span>
            <span className="text-zinc-200 font-semibold">{metrics?.processes?.nproc_limit || 400} NPROC</span>
          </div>

          <div className="p-3 bg-canvas-base rounded border border-hairline flex justify-between">
            <span className="text-zinc-500">Batas I/O Disk</span>
            <span className="text-zinc-200 font-semibold">{metrics?.io?.speed_limit_mb || 32} MB/s</span>
          </div>

          <div className="p-3 bg-canvas-base rounded border border-hairline flex justify-between">
            <span className="text-zinc-500">Batas IOPS</span>
            <span className="text-zinc-200 font-semibold">{metrics?.io?.iops_limit || 4096} IOPS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
