import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { DeployProject, DeployStatusResponse } from '../../types';
import {
  Rocket,
  GitBranch,
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Terminal,
  Clock,
  Play,
  X,
  Copy,
  Check,
  Server,
  Code
} from 'lucide-react';

export const DeployManager: React.FC = () => {
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const terminalRef = useRef<HTMLPreElement | null>(null);

  // Fetch projects list & git metadata
  const { data, isLoading, refetch } = useQuery<{ projects: DeployProject[]; scripts: { deploy_all: boolean } }>({
    queryKey: ['deployProjects'],
    queryFn: () => api.fetchDeployProjects(),
    refetchInterval: 30000,
  });

  // Poll active deployment status
  const { data: deploymentStatus } = useQuery<DeployStatusResponse>({
    queryKey: ['deployStatus', activeDeploymentId],
    queryFn: () => api.fetchDeployStatus(activeDeploymentId!),
    enabled: !!activeDeploymentId,
    refetchInterval: (query) => {
      const state = query.state.data;
      if (state && (state.status === 'success' || state.status === 'failed')) {
        return false;
      }
      return 1500;
    },
  });

  // Auto-scroll terminal log
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [deploymentStatus?.log]);

  // Update deploying state when status changes
  useEffect(() => {
    if (deploymentStatus) {
      if (deploymentStatus.status === 'success' || deploymentStatus.status === 'failed') {
        setIsDeploying(false);
        refetch();
      }
    }
  }, [deploymentStatus, refetch]);

  const handleStartDeploy = async (target: string) => {
    try {
      setIsDeploying(true);
      setActiveTarget(target);
      const res = await api.startDeploy(target);
      setActiveDeploymentId(res.deployment_id);
    } catch (err: any) {
      alert(`Gagal memicu deployment: ${err.message || err}`);
      setIsDeploying(false);
    }
  };

  const handleCopyLog = () => {
    if (deploymentStatus?.log) {
      navigator.clipboard.writeText(deploymentStatus.log);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const projects = data?.projects || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Header */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cobalt-600/10 border border-cobalt-500/20 text-cobalt-400">
            <Rocket className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Deployment Manager</h2>
              <span className="text-[10px] font-mono bg-cobalt-500/10 text-cobalt-300 border border-cobalt-500/25 px-2 py-0.5 rounded-full">
                Zero-Downtime
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Otomasi kompilasi, git pull, dan sinkronisasi server via <code className="text-zinc-200">~/bin/deploy-*</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Segarkan Status Git"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cobalt-400' : ''}`} />
          </button>

          <button
            onClick={() => handleStartDeploy('all')}
            disabled={isDeploying}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cobalt-600 to-indigo-600 hover:from-cobalt-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-glow-cobalt transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Deploy All (Semua Proyek)</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const isTargetDeploying = isDeploying && activeTarget === proj.id;
          const git = proj.git;

          return (
            <div
              key={proj.id}
              className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-cobalt-500/30 transition-all group"
            >
              <div>
                {/* Project Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-cobalt-400">
                      {proj.type === 'laravel' ? (
                        <Server className="w-4 h-4 text-rose-400" />
                      ) : proj.type === 'astro' ? (
                        <Code className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Rocket className="w-4 h-4 text-cobalt-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
                        <span>{proj.name}</span>
                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-mono">{proj.description}</p>
                    </div>
                  </div>
                </div>

                {/* Git Metadata Box */}
                <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2 mb-4 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                      <GitBranch className="w-3.5 h-3.5 text-cobalt-400" />
                      <span>Branch:</span>
                    </span>
                    <span className="text-zinc-200 font-semibold px-2 py-0.5 bg-white/5 rounded">
                      {git.branch}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                      <GitCommit className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Commit:</span>
                    </span>
                    <span className="text-cobalt-300 font-semibold">{git.commit}</span>
                  </div>

                  <div className="text-[11px] text-zinc-300 truncate pt-1 border-t border-white/5">
                    "{git.message}"
                  </div>

                  <div className="flex justify-between text-[10px] text-zinc-500 pt-0.5">
                    <span>{git.author || 'system'}</span>
                    <span>{git.date}</span>
                  </div>

                  {git.is_dirty && (
                    <div className="flex items-center gap-1 text-[10px] text-status-amber bg-status-amber/10 p-1.5 rounded border border-status-amber/20">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>Ada perubahan lokal (dirty repo)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-zinc-500 truncate">
                  {proj.path.replace(/^\/home\/[^/]+\//, '~/')}
                </span>

                <button
                  onClick={() => handleStartDeploy(proj.id)}
                  disabled={isDeploying}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-cobalt-600 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold border border-white/10 hover:border-cobalt-500 transition-all disabled:opacity-50"
                >
                  {isTargetDeploying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cobalt-300" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Deploy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Terminal Log Stream Drawer / Modal */}
      {activeDeploymentId && (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
          {/* Terminal Window Header */}
          <div className="bg-zinc-900/90 border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <Terminal className="w-4 h-4 text-cobalt-400" />
                <span className="text-white font-semibold">
                  Deploy Log: {activeTarget?.toUpperCase()} ({activeDeploymentId})
                </span>
                
                {deploymentStatus?.status === 'running' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Sedang Berjalan ({deploymentStatus.duration}s)</span>
                  </span>
                )}

                {deploymentStatus?.status === 'success' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Selesai Sukses ({deploymentStatus.duration}s)</span>
                  </span>
                )}

                {deploymentStatus?.status === 'failed' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Gagal (Exit code: {deploymentStatus.exit_code})</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLog}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                title="Salin Log Terminal"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>

              <button
                onClick={() => setActiveDeploymentId(null)}
                className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Terminal Console Output */}
          <pre
            ref={terminalRef}
            className="p-4 bg-black/95 text-zinc-200 font-mono text-xs overflow-y-auto max-h-96 leading-relaxed select-text whitespace-pre-wrap"
          >
            {deploymentStatus?.log || 'Menginisialisasi deployment runner...'}
          </pre>
        </div>
      )}
    </div>
  );
};
