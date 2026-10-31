import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { DomainSslHost } from '../../types';
import {
  Globe,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff,
  Calendar,
  Folder,
  Code2,
  Server
} from 'lucide-react';

export const DomainSslViewer: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useQuery<{ hosts: DomainSslHost[] }>({
    queryKey: ['domainsSsl'],
    queryFn: () => api.fetchDomainsSsl(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const hosts = data?.hosts || [];

  const getStatusColor = (status: DomainSslHost['status']) => {
    switch (status) {
      case 'valid': return 'text-status-emerald bg-status-emerald/10 border-status-emerald/25';
      case 'expiring': return 'text-status-amber bg-status-amber/10 border-status-amber/25';
      case 'expired': return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
      case 'no_ssl': return 'text-status-amber bg-status-amber/10 border-status-amber/25';
      default: return 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30';
    }
  };

  const getStatusIcon = (status: DomainSslHost['status']) => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="w-3.5 h-3.5 text-status-emerald" />;
      case 'expiring': return <AlertTriangle className="w-3.5 h-3.5 text-status-amber" />;
      case 'expired': return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'no_ssl': return <ShieldAlert className="w-3.5 h-3.5 text-status-amber" />;
      default: return <Shield className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getStatusLabel = (status: DomainSslHost['status']) => {
    switch (status) {
      case 'valid': return 'SSL Aktif & Valid';
      case 'expiring': return 'Akan Expire ≤30 Hari';
      case 'expired': return 'SSL Kedaluwarsa';
      case 'no_ssl': return 'Menunggu AutoSSL';
      default: return 'Status SSL Unknown';
    }
  };

  const getTypeBadge = (type?: string, label?: string) => {
    switch (type) {
      case 'main':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cobalt-500/15 text-cobalt-400 border border-cobalt-500/25 font-semibold">
            {label || 'Domain Utama'}
          </span>
        );
      case 'addon':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 font-semibold">
            {label || 'Addon Domain'}
          </span>
        );
      case 'subdomain':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-semibold">
            {label || 'Subdomain'}
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-semibold">
            {label || 'Domain'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cobalt-600/10 border border-cobalt-500/20 text-cobalt-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Domain &amp; SSL Cockpit</h2>
              <span className="text-[10px] font-mono bg-cobalt-500/10 text-cobalt-300 border border-cobalt-500/25 px-2 py-0.5 rounded-full">
                Auto-Discovery Dinamis
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Mendeteksi otomatis semua domain utama, addon domain, &amp; subdomain server secara real-time
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-mono border border-white/10 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-cobalt-400' : ''}`} />
          <span>{isFetching ? 'Memindai Server...' : 'Segarkan Daftar'}</span>
        </button>
      </div>

      {/* Summary Strip */}
      {hosts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-white">
              {hosts.length}
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">Total Domain Aktif</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-status-emerald">
              {hosts.filter(h => h.status === 'valid').length}
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">SSL Valid &amp; Aktif</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-status-amber">
              {hosts.filter(h => h.status === 'expiring' || h.status === 'no_ssl').length}
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">Perlu Perhatian / AutoSSL</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-cobalt-400">
              {hosts.filter(h => h.http_ping.is_online).length}
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">HTTP Online</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cobalt-400" />
          <span className="text-xs font-mono text-zinc-400">Memindai semua domain, subdomain, dan sertifikat SSL...</span>
        </div>
      )}

      {/* Hosts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {hosts.map((host) => (
          <div
            key={host.primary_domain}
            className={`glass-card rounded-2xl p-5 border transition-all hover:scale-[1.005] flex flex-col justify-between ${
              host.status === 'valid' ? 'hover:border-status-emerald/30' :
              host.status === 'expiring' ? 'hover:border-status-amber/30' :
              host.status === 'no_ssl' ? 'hover:border-status-amber/30' :
              'hover:border-rose-500/30'
            }`}
          >
            {/* Domain Header */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${
                    host.http_ping.is_online
                      ? 'bg-status-emerald/10 border-status-emerald/20 text-status-emerald'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {host.http_ping.is_online ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white break-all">{host.primary_domain}</h3>
                      <a
                        href={`https://${host.primary_domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"
                        title="Buka Website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getTypeBadge(host.type, host.type_label)}
                      {host.php_version && (
                        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-0.5">
                          <Code2 className="w-3 h-3 text-zinc-500" />
                          <span>{host.php_version}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border font-semibold flex-shrink-0 ${getStatusColor(host.status)}`}>
                  {getStatusIcon(host.status)}
                  <span>{getStatusLabel(host.status)}</span>
                </span>
              </div>

              {/* Document Root Info */}
              {host.docroot && (
                <div className="mb-3 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/5 flex items-center gap-2 text-[11px] font-mono text-zinc-400 truncate">
                  <Folder className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  <span className="truncate" title={host.docroot}>
                    {host.docroot}
                  </span>
                </div>
              )}

              {/* SSL Certificate Info */}
              <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2.5 font-mono text-xs mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-cobalt-400" />
                    <span>Penerbit SSL</span>
                  </span>
                  <span className="text-zinc-200 font-medium text-right truncate max-w-[170px]" title={host.issuer}>
                    {host.issuer}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Masa Berlaku</span>
                  </span>
                  <span className="text-zinc-300">{host.valid_from}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-status-amber" />
                    <span>Kadaluwarsa</span>
                  </span>
                  <span className={`font-semibold ${
                    host.status === 'expired' ? 'text-rose-400' :
                    host.status === 'expiring' || host.status === 'no_ssl' ? 'text-status-amber' :
                    'text-status-emerald'
                  }`}>
                    {host.valid_until}
                  </span>
                </div>

                {/* Days Remaining Progress Bar */}
                {host.status !== 'no_ssl' ? (
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1.5 text-zinc-400">
                      <span>Sisa Validitas</span>
                      <span className={`font-semibold ${
                        host.days_remaining <= 0 ? 'text-rose-400' :
                        host.days_remaining <= 30 ? 'text-status-amber' :
                        'text-status-emerald'
                      }`}>
                        {host.days_remaining > 0 ? `${host.days_remaining} hari` : 'Kedaluwarsa'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          host.days_remaining <= 0 ? 'bg-rose-500' :
                          host.days_remaining <= 30 ? 'bg-status-amber' :
                          'bg-status-emerald'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, (host.days_remaining / 90) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-status-amber bg-status-amber/10 p-2 rounded-lg border border-status-amber/20">
                    Sertifikat SSL belum terbit atau sedang dalam antrean penerbitan AutoSSL (Let's Encrypt).
                  </div>
                )}
              </div>

              {/* HTTP Health Ping */}
              <div className="flex items-center justify-between font-mono text-xs bg-black/30 rounded-xl px-3 py-2.5 border border-white/5">
                <div className="flex items-center gap-2">
                  {host.http_ping.is_online ? (
                    <Wifi className="w-3.5 h-3.5 text-status-emerald" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span className="text-zinc-400">Live Ping</span>
                </div>

                <div className="flex items-center gap-2">
                  {host.http_ping.is_online ? (
                    <>
                      <span className="text-status-emerald font-semibold">HTTP {host.http_ping.http_code}</span>
                      <span className="text-zinc-600">·</span>
                      <span className={`font-medium ${
                        host.http_ping.latency_ms > 1000 ? 'text-status-amber' : 'text-zinc-200'
                      }`}>
                        {host.http_ping.latency_ms}ms
                      </span>
                    </>
                  ) : (
                    <span className="text-rose-400 font-semibold">
                      Offline {host.http_ping.http_code ? `(HTTP ${host.http_ping.http_code})` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Metadata */}
            <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 pt-3 mt-3 border-t border-white/5">
              <span className="flex items-center gap-1">
                <Server className="w-3 h-3" />
                <span>{host.ip}</span>
              </span>
              <span>{host.provider || 'AutoSSL'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
