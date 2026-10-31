import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { SecurityAuditResult, SecurityFinding } from '../../types';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wrench,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  FileText
} from 'lucide-react';

const FindingCard: React.FC<{ finding: SecurityFinding; index: number }> = ({ finding, index }) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const colorConfig = {
    high: {
      row: 'border-rose-500/20 hover:border-rose-500/40',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
      label: 'KRITIS',
    },
    medium: {
      row: 'border-status-amber/20 hover:border-status-amber/40',
      badge: 'bg-status-amber/10 text-status-amber border-status-amber/20',
      icon: <AlertTriangle className="w-4 h-4 text-status-amber flex-shrink-0" />,
      label: 'SEDANG',
    },
    good: {
      row: 'border-status-emerald/20 hover:border-status-emerald/30',
      badge: 'bg-status-emerald/10 text-status-emerald border-status-emerald/20',
      icon: <CheckCircle2 className="w-4 h-4 text-status-emerald flex-shrink-0" />,
      label: 'AMAN',
    },
  }[finding.severity];

  return (
    <div className={`glass-card rounded-xl border transition-all ${colorConfig.row}`}>
      <button
        className="w-full flex items-center justify-between gap-3 p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0 text-left">
          {colorConfig.icon}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${colorConfig.badge}`}>
                {colorConfig.label}
              </span>
              <span className="text-sm font-medium text-white">{finding.title}</span>
            </div>
            <p className="text-[11px] font-mono text-zinc-500 truncate mt-0.5 max-w-md">
              {finding.path}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {finding.can_fix && finding.severity !== 'good' && (
            <span className="text-[10px] font-mono text-cobalt-400 bg-cobalt-500/10 px-2 py-0.5 rounded border border-cobalt-500/20">
              Auto-Fix
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-3">
          <p className="text-xs text-zinc-300 leading-relaxed font-mono">{finding.description}</p>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-black/40 rounded-lg p-3 border border-white/5">
              <div className="text-[10px] text-zinc-500 mb-1">Kondisi Saat Ini</div>
              <div className={`font-semibold ${finding.severity === 'good' ? 'text-status-emerald' : 'text-rose-300'}`}>
                {finding.current}
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-3 border border-white/5">
              <div className="text-[10px] text-zinc-500 mb-1">Rekomendasi</div>
              <div className="font-semibold text-status-emerald">{finding.recommended}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SecurityAuditorView: React.FC = () => {
  const queryClient = useQueryClient();
  const [fixResult, setFixResult] = useState<{ message: string; actions: string[] } | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<SecurityAuditResult>({
    queryKey: ['securityAudit'],
    queryFn: () => api.fetchSecurityAudit(),
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const fixMutation = useMutation({
    mutationFn: () => api.fixSecurityPermissions(),
    onSuccess: (res) => {
      setFixResult({ message: res.message, actions: res.actions });
      queryClient.invalidateQueries({ queryKey: ['securityAudit'] });
    },
    onError: (err: any) => alert(`Gagal menjalankan normalizer: ${err.message}`),
  });

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A+': return 'text-status-emerald';
      case 'A':  return 'text-cobalt-400';
      case 'B':  return 'text-status-amber';
      case 'C':  return 'text-orange-400';
      default:   return 'text-rose-400';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-zinc-700';
    if (score >= 95) return 'bg-status-emerald';
    if (score >= 85) return 'bg-cobalt-500';
    if (score >= 75) return 'bg-status-amber';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const highFindings = data?.findings?.filter(f => f.severity === 'high') || [];
  const mediumFindings = data?.findings?.filter(f => f.severity === 'medium') || [];
  const goodFindings = data?.findings?.filter(f => f.severity === 'good') || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cobalt-600/10 border border-cobalt-500/20 text-cobalt-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Security Auditor</h2>
              <span className="text-[10px] font-mono bg-cobalt-500/10 text-cobalt-300 border border-cobalt-500/25 px-2 py-0.5 rounded-full">
                Permission Analyzer
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Pemeriksaan terpilih atas PHP, izin file SSH, web root, dan beberapa aturan server
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-cobalt-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              if (confirm('Jalankan normalisasi izin? Tindakan ini membatasi izin file SSH dan .env, menghapus bit write untuk pengguna lain pada file web, dan menambahkan aturan .htaccess jika belum ada.')) {
                fixMutation.mutate();
              }
            }}
            disabled={fixMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-glow-cobalt transition-all disabled:opacity-50"
          >
            {fixMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wrench className="w-3.5 h-3.5" />
            )}
            <span>1-Click Normalizer</span>
          </button>
        </div>
      </div>

      {/* Fix Result Notification */}
      {fixResult && (
        <div className="p-4 rounded-xl bg-status-emerald/10 border border-status-emerald/30 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-status-emerald font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>{fixResult.message}</span>
          </div>
          <ul className="space-y-1">
            {fixResult.actions.map((action, i) => (
              <li key={i} className="text-xs font-mono text-zinc-300 flex items-center gap-2">
                <span className="text-status-emerald">✓</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setFixResult(null)}
            className="text-[11px] font-mono text-zinc-400 hover:text-white underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Security Score Dashboard */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cobalt-400" />
          <span className="text-xs font-mono text-zinc-400">Menganalisis keamanan sistem hosting...</span>
        </div>
      ) : data && (
        <>
          {/* Score + Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Security Score Card */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center md:col-span-1">
              <div className={`text-5xl font-black mb-1 ${getGradeColor(data.grade)}`}>
                {data.grade}
              </div>
              <div className="text-sm text-zinc-300 font-mono mb-3">Skor Keamanan</div>

              {/* Score Progress Ring */}
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke={data.score >= 95 ? '#10b981' : data.score >= 85 ? '#3b82f6' : data.score >= 75 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={`${(data.score / 100) * 94.2} 94.2`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{data.score}</span>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-4 border border-rose-500/20 text-center">
                <div className="text-2xl font-bold text-rose-400">{data.summary.high}</div>
                <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-center gap-1">
                  <XCircle className="w-3 h-3" />
                  <span>Kritis</span>
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 border border-status-amber/20 text-center">
                <div className="text-2xl font-bold text-status-amber">{data.summary.medium}</div>
                <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Sedang</span>
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 border border-status-emerald/20 text-center">
                <div className="text-2xl font-bold text-status-emerald">{data.summary.good}</div>
                <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Aman</span>
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 border border-cobalt-500/20 text-center">
                <div className="text-2xl font-bold text-cobalt-400">{data.summary.fixable}</div>
                <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-center gap-1">
                  <Wrench className="w-3 h-3" />
                  <span>Auto-Fixable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-5">
            {/* Critical Findings */}
            {highFindings.length > 0 && (
              <div>
                <h3 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Temuan Kritis ({highFindings.length})
                </h3>
                <div className="space-y-2">
                  {highFindings.map((f, i) => <FindingCard key={f.id} finding={f} index={i} />)}
                </div>
              </div>
            )}

            {/* Medium Findings */}
            {mediumFindings.length > 0 && (
              <div>
                <h3 className="text-xs font-mono font-bold text-status-amber uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Perhatian Sedang ({mediumFindings.length})
                </h3>
                <div className="space-y-2">
                  {mediumFindings.map((f, i) => <FindingCard key={f.id} finding={f} index={i} />)}
                </div>
              </div>
            )}

            {/* Good / Passing */}
            {goodFindings.length > 0 && (
              <div>
                <h3 className="text-xs font-mono font-bold text-status-emerald uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Pemeriksaan Lulus ({goodFindings.length})
                </h3>
                <div className="space-y-2">
                  {goodFindings.map((f, i) => <FindingCard key={f.id} finding={f} index={i} />)}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
