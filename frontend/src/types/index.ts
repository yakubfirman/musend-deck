export interface AuthStatus {
  authenticated: boolean;
  username: string | null;
  csrf_token: string;
}

export interface MetricCpu {
  usage_percent: number;
  limit_percent: number;
  cores: number;
}

export interface MetricRam {
  used_bytes: number;
  limit_bytes: number;
  usage_percent: number;
  formatted_used: string;
  formatted_limit: string;
}

export interface MetricDisk {
  used_bytes: number;
  total_bytes: number;
  free_bytes: number;
  usage_percent: number;
  formatted_used: string;
  formatted_total: string;
  is_unmetered?: boolean;
  inodes_used: number;
  inodes_limit: number;
  is_inodes_unmetered?: boolean;
}

export interface MetricProcesses {
  nproc_count: number;
  nproc_limit: number;
  ep_count: number;
  ep_limit: number;
}

export interface MetricIo {
  speed_current_bytes?: number;
  speed_limit_bytes: number;
  speed_limit_mb: number;
  iops_current?: number;
  iops_limit: number;
}

export interface MetricBandwidth {
  used_bytes: number;
  formatted_used: string;
  is_unmetered?: boolean;
}

export interface MetricLoadAvg {
  '1m': number;
  '5m': number;
  '15m': number;
}

export interface SystemInfo {
  php_version: string;
  os: string;
  server_time: string;
  user: string;
  web_server?: string;
}

export interface HostingFeatures {
  addon_domains: number;
  addon_domains_max: number;
  subdomains: number;
  email_accounts: number;
  postgres_dbs: number;
  mysql_dbs: number;
  ftp_accounts: number;
}

export interface MetricsData {
  cpu: MetricCpu;
  ram: MetricRam;
  disk: MetricDisk;
  processes: MetricProcesses;
  io: MetricIo;
  bandwidth: MetricBandwidth;
  load_average: MetricLoadAvg;
  system: SystemInfo;
  features?: HostingFeatures;
  from_cache?: boolean;
  cache_age?: number;
  cached_at?: number;
}

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  formatted_size: string;
  mtime: number;
  formatted_date: string;
  perms: string;
  extension: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface FileListData {
  current_path: string;
  root_name: string;
  breadcrumbs: BreadcrumbItem[];
  total_items: number;
  items: FileItem[];
}

export interface ProcessItem {
  pid: number;
  ppid: number;
  cpu: number;
  mem: number;
  time: string;
  comm: string;
  args: string;
}

export interface LogData {
  type: string;
  file: string | null;
  full_path?: string;
  lines: string[];
  line_count: number;
  file_size?: number;
}
