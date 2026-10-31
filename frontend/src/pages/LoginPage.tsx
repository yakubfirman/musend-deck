import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, Loader2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('musend');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [capsLockActive, setCapsLockActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Detect Caps Lock state
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas-base bg-tech-grid relative overflow-hidden selection:bg-cobalt-600 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cobalt-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-status-emerald/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-canvas-surface/80 border border-white/10 shadow-glow-cobalt backdrop-blur-md mb-3.5 transition-transform hover:scale-105 duration-200">
            <div className="flex flex-col gap-1 w-7">
              <div className="h-1 bg-gradient-to-r from-cobalt-500 to-indigo-500 rounded-full w-full shadow-sm" />
              <div className="h-1 bg-gradient-to-r from-cobalt-400 to-cyan-400 rounded-full w-3/4 shadow-sm" />
              <div className="h-1 bg-zinc-600 rounded-full w-1/2" />
            </div>
          </div>
          
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>ServerDeck</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cobalt-500/10 text-cobalt-400 border border-cobalt-500/20">
              v1.1
            </span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">Hosting & Server Management Panel</p>

          <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-white/5 text-[11px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-status-emerald animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-status-emerald -ml-3" />
            <span>musend.web.id</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500">LiteSpeed</span>
          </div>
        </div>

        {/* Login Box */}
        <div className="glass-card rounded-2xl p-6 sm:p-7 shadow-2xl border border-white/10 backdrop-blur-xl">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs font-mono flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                Username Akun
              </label>
              <div className="relative group">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cobalt-400 transition-colors" />
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="musend"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono font-medium text-zinc-300">
                  Kata Sandi
                </label>
                {capsLockActive && (
                  <span className="text-[10px] font-mono text-status-amber bg-status-amber/10 px-1.5 py-0.5 rounded border border-status-amber/20">
                    CAPS LOCK AKTIF
                  </span>
                )}
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cobalt-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cobalt-600/25 border border-white/10 interactive-tap disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Sesi...</span>
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

        {/* Security Footer Note */}
        <div className="flex items-center justify-center gap-1.5 mt-6 text-[11px] font-mono text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-status-emerald" />
          <span>CloudLinux CageFS Protected • Zero Daemon</span>
        </div>
      </div>
    </div>
  );
};
