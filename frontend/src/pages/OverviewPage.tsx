import React from 'react';
import {
  Cpu,
  Database,
  HardDrive,
  Activity,
  Zap,
  Globe,
  RefreshCw,
  Server,
  Radio,
  Clock,
  Layers,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { MetricsData } from '../types';
import { StatCard } from '../components/common/StatCard';
import { MetricsHistoryChart } from '../components/overview/MetricsHistoryChart';

interface OverviewPageProps {
  metrics: MetricsData | null;
  loading: boolean;
  onRefresh: (force?: boolean) => void | Promise<void>;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ metrics, loading, onRefresh }) => {
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400 font-mono text-xs gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cobalt-500" />
        <span>Mengambil telemetri server hosting secara real-time...</span>
      </div>
    );
  }

  const { cpu, ram, disk, processes, io, bandwidth, load_average, system, features, from_cache, cache_age } = metrics;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Control Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cobalt-500/10 border border-cobalt-500/20 text-cobalt-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Hosting Telemetry Deck</h2>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-status-emerald bg-status-emerald/10 border border-status-emerald/25 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-status-emerald animate-ping" />
                {system.telemetry_source || 'Telemetry'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              Data host untuk akun: <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{system.user}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {from_cache ? (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 tabular-nums">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>Cache {cache_age ?? 0}s lalu</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-status-emerald bg-status-emerald/10 border border-status-emerald/25 px-3 py-1.5 rounded-xl tabular-nums animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-status-emerald animate-ping" />
              <span>Data Baru (Live)</span>
            </div>
          )}

          <button
            onClick={() => onRefresh(true)}
            disabled={loading}
            title="Segarkan data telemetri langsung dari server"
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-medium bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 text-zinc-800 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 interactive-tap disabled:opacity-50 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cobalt-500' : ''}`} />
            <span>{loading ? 'Menyegarkan...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* CPU Card */}
        <StatCard
          label="Beban CPU Server"
          value={`${cpu.usage_percent}%`}
          limit={`${cpu.limit_percent}% (${cpu.cores} Core)`}
          percent={cpu.usage_percent}
          icon={Cpu}
          subValue={`Penggunaan Aktif: ${cpu.usage_percent}%`}
          detailList={[
            { label: 'Core Terpasang', value: `${cpu.cores} vCPU Core` },
            { label: 'Batas Kuota', value: `${cpu.limit_percent}% Speed` },
            { label: 'Load Avg (1/5/15m)', value: `${load_average['1m']} • ${load_average['5m']}` },
          ]}
        />

        {/* RAM Card */}
        <StatCard
          label="RAM Fisik Hosting"
          value={ram.formatted_used}
          limit={ram.formatted_limit}
          percent={ram.usage_percent}
          icon={Database}
          subValue={`Terpakai ${ram.usage_percent}% dari batas memori (${ram.formatted_limit})`}
          detailList={[
            { label: 'Alokasi RAM Fisik', value: ram.formatted_limit },
            { label: 'Sisa RAM Bebas', value: `${(Math.max(0, ram.limit_bytes - ram.used_bytes) / (1024 * 1024 * 1024)).toFixed(2)} GB` },
          ]}
        />

        {/* Disk Card */}
        <StatCard
          label="Penyimpanan Akun"
          value={disk.usage_available === false ? 'Tidak tersedia' : disk.formatted_used}
          limit={disk.quota_available === false ? 'Kuota tidak tersedia' : (disk.is_unmetered ? 'Unmetered' : disk.formatted_total)}
          percent={!disk.quota_available || disk.is_unmetered || disk.usage_available === false ? undefined : disk.usage_percent}
          icon={HardDrive}
          status={!disk.is_unmetered && disk.usage_percent > 85 ? 'rose' : 'default'}
          subValue={disk.usage_available === false ? 'Data pemakaian disk tidak tersedia.' : disk.is_unmetered ? `Terpakai ${disk.formatted_used}${disk.is_estimated ? ' (perkiraan ukuran home)' : ' (CloudLinux UAPI)'}` : disk.quota_available === false ? `Ukuran home ${disk.is_estimated ? 'perkiraan ' : ''}${disk.formatted_used}; kuota tidak tersedia` : `Terpakai ${disk.formatted_used}${disk.is_estimated ? ' (perkiraan home)' : ''} dari ${disk.formatted_total} (${disk.usage_percent}%)`}
          detailList={[
            { label: 'Inodes (File)', value: disk.inodes_usage_available === false ? 'Tidak tersedia' : `${disk.inodes_used.toLocaleString()} file` },
            { label: 'Batas Inodes', value: disk.inodes_quota_available === false ? 'Tidak tersedia' : (disk.inodes_limit && disk.inodes_limit > 0 ? `${disk.inodes_limit.toLocaleString()} file` : 'Unmetered') },
            { label: 'Status Kuota', value: disk.quota_available === false ? 'Tidak tersedia' : (disk.is_unmetered ? 'Unmetered' : (disk.usage_percent > 85 ? 'Mendekati Batas' : 'Normal')) },
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
            { label: 'Status Eksekusi', value: processes.ep_count > 45 ? 'Tinggi' : 'Normal / Stabil' },
            { label: 'Batas Maksimum', value: `${processes.nproc_limit} Proses` },
          ]}
        />
      </div>

      {/* Collected metrics trend */}
      <MetricsHistoryChart history={metrics.history} />

      {/* Secondary Metrics & Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* I/O Performance */}
        <div className="glass-card rounded-2xl p-5 hover:border-status-amber/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              I/O Speed & IOPS
            </span>
            <div className="p-2 rounded-xl bg-status-amber/10 border border-status-amber/20 text-status-amber group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Kecepatan I/O Saat Ini</span>
              <span className="text-zinc-100 font-semibold tabular-nums bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {io.speed_available === false ? 'Tidak tersedia' : (io.speed_current_bytes ? `${(io.speed_current_bytes / 1024).toFixed(1)} KB/s` : '0 KB/s')}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Batas Kecepatan I/O</span>
              <span className="text-zinc-100 font-semibold tabular-nums bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {io.speed_limit_available === false ? 'Tidak tersedia' : `${io.speed_limit_mb} MB/s`}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Batas IOPS</span>
              <span className="text-zinc-100 font-semibold tabular-nums bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {io.iops_limit_available === false ? 'Tidak tersedia' : `${io.iops_limit.toLocaleString()} IOPS`}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
              {io.speed_available === false ? 'Pemakaian I/O aktual membutuhkan CloudLinux UAPI.' : 'Data pemakaian I/O tersedia dari CloudLinux UAPI.'}
            </div>
          </div>
        </div>

        {/* Bandwidth Usage */}
        <div className="glass-card rounded-2xl p-5 hover:border-cobalt-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              Bandwidth Bulanan
            </span>
            <div className="p-2 rounded-xl bg-cobalt-500/10 border border-cobalt-500/20 text-cobalt-400 group-hover:scale-110 transition-transform">
              <Globe className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Terpakai Bulan Ini</span>
              <span className="text-zinc-100 font-semibold tabular-nums bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {bandwidth.is_available === false ? 'Tidak tersedia' : bandwidth.formatted_used}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Alokasi Hosting</span>
              <span className="text-status-emerald font-semibold bg-status-emerald/10 px-2 py-0.5 rounded border border-status-emerald/20">
                {bandwidth.quota_available === false ? 'Tidak tersedia' : bandwidth.formatted_limit}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Addon Domains</span>
              <span className="text-zinc-200 font-semibold">
                {features?.addon_domains ?? 0} {features?.addon_domains_max ? `/ ${features.addon_domains_max}` : ''} domain
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
              Data usage dan alokasi ditampilkan bila tersedia dari UAPI hosting.
            </div>
          </div>
        </div>

        {/* Server Node Info */}
        <div className="glass-card rounded-2xl p-5 hover:border-status-emerald/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              Node & Runtime
            </span>
            <div className="p-2 rounded-xl bg-status-emerald/10 border border-status-emerald/20 text-status-emerald group-hover:scale-110 transition-transform">
              <Server className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Web Server</span>
              <span className="text-zinc-100 font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {system.web_server || 'Linux Web Server'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Versi PHP Active</span>
              <span className="text-zinc-100 font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                PHP {system.php_version}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-zinc-400">Database Aktif</span>
              <span className="text-zinc-200 font-semibold">
                PostgreSQL ({features?.postgres_dbs ?? 1}) • MySQL ({features?.mysql_dbs ?? 0})
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
              Backend aplikasi dipanggil saat ada permintaan; deployment dapat menjalankan proses sementara.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
