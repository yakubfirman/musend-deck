import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Loader2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [capsLockActive, setCapsLockActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server';

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState('CapsLock'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.login(username.trim(), password);
      setLoading(false);
      onLoginSuccess(res.data?.username || username.trim());
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Kredensial login tidak valid.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-base relative overflow-hidden selection:bg-cobalt-600 selection:text-white">

      {/* ── Background glows ── */}
      <div className="absolute inset-0 bg-tech-grid opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-cobalt-600/8 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[350px] bg-indigo-700/6 rounded-full blur-[110px] pointer-events-none" />

      {/* ── Main card ── */}
      <div className="relative z-10 w-full max-w-[420px] px-4 py-10 animate-fade-in">

        {/* ── Logo & Brand ── */}
        <div className="flex flex-col items-center mb-8 text-center">

          {/* Logo container */}
          <div className="relative mb-5 group">
            <div className="absolute inset-0 rounded-[22px] bg-cobalt-500/25 blur-xl scale-110 group-hover:scale-125 transition-transform duration-500" />
            <div className="relative w-[88px] h-[88px] rounded-[22px] bg-canvas-surface border border-white/12 shadow-glow-cobalt flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 duration-300">
              <img
                src="./icon-192x192.png"
                alt="Musend Deck Logo"
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const fallback = img.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              {/* Fallback bars icon */}
              <div style={{ display: 'none' }} className="flex-col gap-1.5 w-9">
                <div className="h-2 bg-gradient-to-r from-cobalt-500 to-indigo-500 rounded-full w-full" />
                <div className="h-2 bg-gradient-to-r from-cobalt-400 to-cyan-400 rounded-full w-3/4" />
                <div className="h-2 bg-zinc-600 rounded-full w-1/2" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[22px] font-bold tracking-tight text-white flex items-center justify-center gap-2.5">
            Musend Deck
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cobalt-500/15 text-cobalt-400 border border-cobalt-500/25">
              v1.2
            </span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1.5 tracking-wide">
            Lightweight Hosting &amp; Cloud Management Cockpit
          </p>

          {/* Online badge */}
          <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-zinc-900/70 border border-white/8 text-[11px] font-mono text-zinc-400 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-emerald opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-emerald" />
            </span>
            <span className="text-zinc-300 font-medium">{hostname}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-600">PHP on-demand</span>
          </div>
        </div>

        {/* ── Login Card ── */}
        <div className="glass-card rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Top glow line */}
          <div className="h-px bg-gradient-to-r from-transparent via-cobalt-500/60 to-transparent" />

          <div className="px-7 py-7">
            <p className="text-[10px] font-mono text-zinc-600 mb-5 uppercase tracking-[0.15em]">
              — Autentikasi Diperlukan —
            </p>

            {/* Error */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-status-rose/10 border border-status-rose/25 text-status-rose text-xs font-mono flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Username field */}
              <div>
                <label className="block text-[11px] font-mono font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative group">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-cobalt-400 transition-colors duration-200" />
                  <input
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username panel hosting"
                    required
                    className="w-full bg-black/50 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-100 font-mono placeholder:text-zinc-700 focus:outline-none focus:border-cobalt-500/70 focus:ring-2 focus:ring-cobalt-500/15 transition-all duration-200 hover:border-white/15"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
                    Kata Sandi
                  </label>
                  {capsLockActive && (
                    <span className="text-[10px] font-mono text-status-amber bg-status-amber/10 px-1.5 py-0.5 rounded border border-status-amber/20 animate-in fade-in duration-150">
                      ⇪ CAPS LOCK
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-cobalt-400 transition-colors duration-200" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyEvent}
                    onKeyUp={handleKeyEvent}
                    placeholder="••••••••••••••"
                    required
                    className="w-full bg-black/50 border border-white/8 rounded-xl pl-10 pr-11 py-3 text-sm text-zinc-100 font-mono placeholder:text-zinc-700 focus:outline-none focus:border-cobalt-500/70 focus:ring-2 focus:ring-cobalt-500/15 transition-all duration-200 hover:border-white/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors duration-200 p-1.5 rounded-lg hover:bg-white/5"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !password || !username.trim()}
                className="w-full mt-1 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 active:scale-[0.98] text-white text-sm font-semibold tracking-wide shadow-lg shadow-cobalt-600/25 border border-white/10 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom line */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-col items-center gap-2 mt-6 text-[11px] font-mono text-zinc-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-status-emerald/60" />
            <span>PHP on-demand · Linux account permissions</span>
          </div>
          <div>
            <span className="text-zinc-700">by </span>
            <a
              href="https://yakubfirman.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cobalt-500/80 hover:text-cobalt-400 transition-colors font-semibold"
            >
              Yakub Firman Mustofa
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
