import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { DomainSslHost } from '../../types';
import {
  Globe,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff,
  Calendar,
  Clock,
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
    }
  };

  const getStatusIcon = (status: DomainSslHost['status']) => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="w-3.5 h-3.5 text-status-emerald" />;
      case 'expiring': return <AlertTriangle className="w-3.5 h-3.5 text-status-amber" />;
      case 'expired': return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  const getStatusLabel = (status: DomainSslHost['status']) => {
    switch (status) {
      case 'valid': return 'SSL Aktif & Valid';
      case 'expiring': return 'Akan Expire ≤30 Hari';
      case 'expired': return 'SSL Kedaluwarsa';
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
              <h2 className="text-base font-bold text-white tracking-tight">Domain & SSL Monitor</h2>
              <span className="text-[10px] font-mono bg-cobalt-500/10 text-cobalt-300 border border-cobalt-500/25 px-2 py-0.5 rounded-full">
                Let's Encrypt AutoSSL
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Pemantauan sertifikat SSL secara real-time langsung dari cPanel UAPI
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-mono border border-white/10 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-cobalt-400' : ''}`} />
          <span>{isFetching ? 'Memeriksa...' : 'Segarkan Ping'}</span>
        </button>
      </div>

      {/* Summary Strip */}
      {hosts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-status-emerald">
              {hosts.filter(h => h.status === 'valid').length}
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">SSL Valid</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-status-amber">
              {hosts.filter(h => h.status === 'expiring').length}
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">Expiring</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold text-white">
              {hosts.filter(h => h.http_ping.is_online).length}
            </div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">Online</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cobalt-400" />
          <span className="text-xs font-mono text-zinc-400">Memeriksa sertifikat SSL & koneksi HTTP ke semua domain...</span>
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
                      <h3 className="font-bold text-sm text-white">{host.primary_domain}</h3>
                      <a
                        href={`https://${host.primary_domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">{host.provider}</p>
                  </div>
                </div>

                <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border font-semibold ${getStatusColor(host.status)}`}>
                  {getStatusIcon(host.status)}
                  <span>{getStatusLabel(host.status)}</span>
                </span>
              </div>

              {/* SSL Certificate Info */}
              <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2.5 font-mono text-xs mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-cobalt-400" />
                    <span>Issuer</span>
                  </span>
                  <span className="text-zinc-200 font-medium text-right">{host.issuer}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Valid Dari</span>
                  </span>
                  <span className="text-zinc-300">{host.valid_from}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-status-amber" />
                    <span>Expire</span>
                  </span>
                  <span className={`font-semibold ${
                    host.status === 'expired' ? 'text-rose-400' :
                    host.status === 'expiring' ? 'text-status-amber' :
                    'text-status-emerald'
                  }`}>
                    {host.valid_until}
                  </span>
                </div>

                {/* Days Remaining Progress Bar */}
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
              </div>

              {/* HTTP Health Ping */}
              <div className="flex items-center justify-between font-mono text-xs bg-black/30 rounded-xl px-3 py-2.5 border border-white/5">
                <div className="flex items-center gap-2">
                  {host.http_ping.is_online ? (
                    <Wifi className="w-3.5 h-3.5 text-status-emerald" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span className="text-zinc-400">HTTP Ping</span>
                </div>

                <div className="flex items-center gap-2">
                  {host.http_ping.is_online ? (
                    <>
                      <span className="text-status-emerald font-semibold">HTTP {host.http_ping.http_code}</span>
                      <span className="text-zinc-400">·</span>
                      <span className={`font-medium ${
                        host.http_ping.latency_ms > 1000 ? 'text-status-amber' : 'text-zinc-200'
                      }`}>
                        {host.http_ping.latency_ms}ms
                      </span>
                    </>
                  ) : (
                    <span className="text-rose-400 font-semibold">Offline</span>
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
              <span>{host.fqdns_count} FQDN terdaftar</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
