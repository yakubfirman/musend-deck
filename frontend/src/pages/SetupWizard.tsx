import React, { useState } from 'react';
import {
  Rocket,
  Shield,
  KeyRound,
  User,
  Server,
  Cpu,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  HardDrive,
  Sliders,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { ServerSetupInfo } from '../types';

interface SetupWizardProps {
  serverInfo?: ServerSetupInfo;
  setupTokenReady?: boolean;
  onSetupSuccess: (username: string, csrfToken: string) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ serverInfo, setupTokenReady, onSetupSuccess }) => {
  const [username, setUsername] = useState<string>('admin');
  const [setupToken, setSetupToken] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [rootDir, setRootDir] = useState<string>(serverInfo?.suggested_root_dir || '/home');
  const [cpuCores, setCpuCores] = useState<number>(serverInfo?.suggested_cpu_cores || 4);
  const [ramGb, setRamGb] = useState<number>(serverInfo?.suggested_ram_gb || 4);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Password strength calculation
  const getStrength = (pwd: string) => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 12) s += 1;
    if (pwd.length >= 16) s += 1;
    if (/[A-Z]/.test(pwd)) s += 1;
    if (/[0-9]/.test(pwd)) s += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) s += 1;
    return s;
  };
  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (username.length < 3) {
      setErrorMsg('Username panel minimal 3 karakter.');
      return;
    }

    if (!/^[a-f0-9]{64}$/i.test(setupToken.trim())) {
      setErrorMsg('Masukkan token setup 64 karakter yang ditampilkan oleh perintah php setup-token.php.');
      return;
    }

    if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
      setErrorMsg('Kata sandi harus memiliki panjang 12 karakter atau lebih dan maksimal 72 byte.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.installSetup({
        setup_token: setupToken.trim(),
        username,
        password,
        root_dir: rootDir,
        cpu_cores: cpuCores,
        ram_gb: ramGb,
      });

      if (res.success) {
        onSetupSuccess(res.username || username, res.csrf_token || '');
      } else {
        setErrorMsg(res.error || 'Gagal menyelesaikan pemasangan.');
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan jaringan.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-base bg-tech-grid flex items-center justify-center p-4 sm:p-6 text-zinc-100 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cobalt-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-canvas-surface border border-white/10 shadow-glow-cobalt flex items-center justify-center overflow-hidden">
              <img
                src="./icon-192x192.png"
                alt="Musend Deck Logo"
                className="w-11 h-11 object-contain"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                }}
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300 backdrop-blur-md mb-1 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-status-emerald animate-ping" />
            <span>Pemasangan Pertama Kali (First-Time Setup)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-3">
            <span>Musend Deck Setup Wizard</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Atur akun pengelola dan spesifikasi server Anda dalam beberapa detik. Tanpa perlu konfigurasi file manual.
          </p>
        </div>

        {/* Setup Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl backdrop-blur-2xl space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs font-mono flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {serverInfo?.suggested_system_user === 'root' && (
              <div className="p-3.5 rounded-xl bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs leading-relaxed">
                PHP berjalan sebagai <code>root</code>. Setup diblokir karena terminal panel akan mewarisi hak root. Jalankan PHP web server dengan akun Linux non-root lalu muat ulang halaman ini.
              </div>
            )}
            {setupTokenReady === false && serverInfo?.suggested_system_user !== 'root' && (
              <div className="p-3.5 rounded-xl bg-status-amber/10 border border-status-amber/30 text-status-amber text-xs leading-relaxed">
                Token setup belum tersedia untuk akun PHP web. Jalankan <code>php setup-token.php</code> melalui SSH dengan akun Linux yang sama dengan PHP-FPM, lalu muat ulang halaman ini.
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-mono font-medium text-zinc-300">
                Token Setup Satu Kali
              </label>
              <input
                type="password"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="Tempel token dari terminal server"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cobalt-500 focus:ring-1 focus:ring-cobalt-500/30 transition-all"
              />
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Di direktori instalasi, jalankan <code className="text-zinc-300">php setup-token.php</code> melalui SSH. Token hanya berlaku untuk setup pertama dan akan dihapus setelah berhasil.
              </p>
            </div>

            {/* Section 1: Administrator Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <KeyRound className="w-4 h-4 text-cobalt-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  1. Akun Administrator Panel
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                  Username Login
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="admin atau nama Anda"
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cobalt-500 focus:ring-1 focus:ring-cobalt-500/30 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                    Kata Sandi (Min. 12 Karakter, Maks. 72 Byte)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={12}
                    maxLength={72}
                    placeholder="••••••••••••"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cobalt-500 focus:ring-1 focus:ring-cobalt-500/30 transition-all"
                  />
                  {password && (
                    <div className="mt-1.5 flex gap-1 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength <= 2
                            ? 'bg-status-rose w-1/3'
                            : strength <= 3
                            ? 'bg-status-amber w-2/3'
                            : 'bg-status-emerald w-full'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                    Konfirmasi Kata Sandi
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cobalt-500 focus:ring-1 focus:ring-cobalt-500/30 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Quota & System Specs */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    2. Spesifikasi Paket Server / Hosting
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] font-mono text-cobalt-400 hover:text-cobalt-300 transition-colors"
                >
                  {showAdvanced ? 'Tutup Detail' : 'Kustomisasi Lanjut'}
                </button>
              </div>

              {/* CPU Cores Selector */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-2">
                  Alokasi CPU Core: <span className="text-white font-bold">{cpuCores} Core ({cpuCores * 100}%)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 8].map((cores) => (
                    <button
                      key={cores}
                      type="button"
                      onClick={() => setCpuCores(cores)}
                      className={`py-2 rounded-xl text-xs font-mono border transition-all ${
                        cpuCores === cores
                          ? 'bg-cobalt-600 text-white font-bold border-cobalt-500 shadow-sm'
                          : 'bg-black/30 text-zinc-400 border-white/10 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cores} Core
                    </button>
                  ))}
                </div>
              </div>

              {/* RAM Selector */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-2">
                  Batas RAM Fisik: <span className="text-white font-bold">{ramGb} GB</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 4, 8, 16].map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => setRamGb(gb)}
                      className={`py-2 rounded-xl text-xs font-mono border transition-all ${
                        ramGb === gb
                          ? 'bg-status-emerald text-black font-bold border-status-emerald shadow-sm'
                          : 'bg-black/30 text-zinc-400 border-white/10 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {gb} GB
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced System User & Root Path */}
              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Akun Linux yang menjalankan PHP
                    </label>
                    <div className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono">
                      {serverInfo?.suggested_system_user || 'Ditentukan oleh server'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Direktori Root / Home
                    </label>
                    <input
                      type="text"
                      value={rootDir}
                      onChange={(e) => setRootDir(e.target.value)}
                      required
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cobalt-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Server Environment Chips */}
            <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-status-emerald" />
                <span>PHP: {serverInfo?.php_version || '8.2+'}</span>
              </span>
              <span>OS: {serverInfo?.os || 'Linux'}</span>
              <span className="text-zinc-500">PHP on-demand</span>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cobalt-600 via-indigo-600 to-purple-600 hover:from-cobalt-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-glow-cobalt flex items-center justify-center gap-2 transition-all interactive-tap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengonfigurasi Musend Deck...</span>
                </>
              ) : (
                <>
                  <span>Instal & Masuk ke Dashboard</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info & Author Attribution */}
        <div className="text-center space-y-1.5 text-[11px] font-mono text-zinc-500">
          <p>
            Pastikan server web memblokir akses langsung ke file konfigurasi dan file tersembunyi.
          </p>
          <p className="text-[10px]">
            Musend Deck dikembangkan oleh{' '}
            <a
              href="https://yakubfirman.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cobalt-400 hover:text-cobalt-300 underline font-semibold transition-colors"
            >
              Yakub Firman Mustofa
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
