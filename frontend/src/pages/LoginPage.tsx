import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('yakubfir');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.login(username.trim(), password);
      setLoading(false);
      onLoginSuccess(res.data?.username || username);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Kredensial tidak valid.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas-base">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-canvas-surface border border-hairline mb-3">
            <div className="flex flex-col gap-1 w-6">
              <div className="h-1 bg-cobalt-600 rounded-full w-full" />
              <div className="h-1 bg-cobalt-500 rounded-full w-3/4" />
              <div className="h-1 bg-zinc-600 rounded-full w-1/2" />
            </div>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">ServerDeck</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">Hosting & Server Management Panel</p>
        </div>

        {/* Login Box */}
        <div className="bg-canvas-surface border border-hairline rounded-xl p-6 shadow-2xl">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-status-rose/10 border border-status-rose/30 text-status-rose text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">Username Akun</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yakubfir"
                  required
                  className="w-full bg-canvas-base border border-hairline rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-cobalt-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-canvas-base border border-hairline rounded-lg pl-9 pr-10 py-2 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-cobalt-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-cobalt-600 hover:bg-cobalt-500 disabled:opacity-50 text-white text-xs font-medium interactive-tap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk ke Panel</span>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Note */}
        <div className="text-center mt-6 text-[11px] font-mono text-zinc-600">
          CloudLinux CageFS Isolated Session
        </div>
      </div>
    </div>
  );
};
