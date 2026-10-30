import React from 'react';
import {
  Cpu,
  Database,
  HardDrive,
  Activity,
  Zap,
  Globe,
  RefreshCw,
  Server
} from 'lucide-react';
import { MetricsData } from '../types';
import { StatCard } from '../components/common/StatCard';

interface OverviewPageProps {
  metrics: MetricsData | null;
  loading: boolean;
  onRefresh: (force?: boolean) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ metrics, loading, onRefresh }) => {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500 font-mono text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-cobalt-500" />
        <span>Memuat metrik LVE hosting...</span>
      </div>
    );
  }

  const { cpu, ram, disk, processes, io, bandwidth, load_average, system, from_cache, cache_age } = metrics;

  return (
    <div className="space-y-6">
      {/* Page Control Header */}
      <div className="bg-canvas-surface border border-hairline rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Hosting Resource Telemetry</h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Batas paket CloudLinux LVE pengguna: <span className="text-zinc-300">{system.user}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {from_cache && (
            <span className="text-[11px] font-mono text-zinc-500 bg-zinc-800/80 px-2.5 py-1 rounded border border-white/5 tabular-nums">
              Cache {cache_age ?? 0}s lalu (15s TTL)
            </span>
          )}

          <button
            onClick={() => onRefresh(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md border border-hairline interactive-tap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <StatCard
          label="CPU Paket LVE"
          value={`${cpu.usage_percent}%`}
          limit={`${cpu.limit_percent}% (${cpu.cores} Core)`}
          percent={cpu.usage_percent}
          icon={Cpu}
          subValue={`Load: ${load_average['1m']} • ${load_average['5m']} • ${load_average['15m']}`}
        />

        {/* RAM Card */}
        <StatCard
          label="RAM Fisik Hosting"
          value={ram.formatted_used}
          limit={ram.formatted_limit}
          percent={ram.usage_percent}
          icon={Database}
          subValue={`Terpakai ${ram.usage_percent}% dari kuota LVE`}
        />

        {/* Disk Card */}
        <StatCard
          label="Penyimpanan Akun"
          value={disk.formatted_used}
          limit={disk.formatted_total}
          percent={disk.usage_percent}
          icon={HardDrive}
          detailList={[
            { label: 'Inodes', value: `${disk.inodes_used.toLocaleString()} / ${disk.inodes_limit.toLocaleString()}` },
            { label: 'Sisa Ruang', value: `${(disk.free_bytes / (1024 * 1024 * 1024)).toFixed(1)} GB` },
          ]}
        />

        {/* Processes Card */}
        <StatCard
          label="Limit Proses & EP"
          value={processes.nproc_count}
          limit={`${processes.nproc_limit} NPROC`}
          percent={Math.round((processes.nproc_count / processes.nproc_limit) * 100)}
          icon={Activity}
          detailList={[
            { label: 'Entry Processes', value: `${processes.ep_count} / ${processes.ep_limit} EP` },
            { label: 'Status LVE', value: processes.ep_count > 45 ? 'Tinggi' : 'Normal' },
          ]}
        />
      </div>

      {/* Secondary Metrics & Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* I/O Performance */}
        <div className="bg-canvas-surface border border-hairline rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">I/O Speed & IOPS</span>
            <div className="p-1.5 rounded border border-white/10 bg-white/5 text-zinc-400">
              <Zap className="w-4 h-4 text-status-amber" />
            </div>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-hairline">
              <span className="text-zinc-500">Batas Kecepatan I/O</span>
              <span className="text-zinc-200 font-semibold tabular-nums">{io.speed_limit_mb} MB/s</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-hairline">
              <span className="text-zinc-500">Batas IOPS</span>
              <span className="text-zinc-200 font-semibold tabular-nums">{io.iops_limit.toLocaleString()} IOPS</span>
            </div>
            <div className="text-[11px] text-zinc-500 pt-1">
              Dibatasi oleh CloudLinux OS Kernel CageFS.
            </div>
          </div>
        </div>

        {/* Bandwidth Usage */}
        <div className="bg-canvas-surface border border-hairline rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Bandwidth Bulanan</span>
            <div className="p-1.5 rounded border border-white/10 bg-white/5 text-zinc-400">
              <Globe className="w-4 h-4 text-cobalt-500" />
            </div>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-hairline">
              <span className="text-zinc-500">Terpakai Bulan Ini</span>
              <span className="text-zinc-200 font-semibold tabular-nums">{bandwidth.formatted_used}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-hairline">
              <span className="text-zinc-500">Alokasi Hosting</span>
              <span className="text-zinc-200 font-semibold">Unmetered / Kuota</span>
            </div>
            <div className="text-[11px] text-zinc-500 pt-1">
              Termasuk lalu lintas HTTP, HTTPS, dan FTP akun.
            </div>
          </div>
        </div>

        {/* Server Node Info */}
        <div className="bg-canvas-surface border border-hairline rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Node & Runtime</span>
            <div className="p-1.5 rounded border border-white/10 bg-white/5 text-zinc-400">
              <Server className="w-4 h-4 text-status-emerald" />
            </div>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-hairline">
              <span className="text-zinc-500">PHP Version</span>
              <span className="text-zinc-200 font-semibold">{system.php_version}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-hairline">
              <span className="text-zinc-500">Waktu Server</span>
              <span className="text-zinc-200 font-semibold tabular-nums">{system.server_time.split(' ')[1]}</span>
            </div>
            <div className="text-[11px] text-zinc-500 pt-1">
              Zero-Daemon Architecture (Idle RAM 0 MB).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
