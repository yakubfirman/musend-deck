export interface ServerSetupInfo {
  suggested_system_user: string;
  suggested_root_dir: string;
  suggested_cpu_cores: number;
  suggested_ram_gb: number;
  php_version: string;
  os: string;
}

export interface AuthStatus {
  installed: boolean;
  authenticated: boolean;
  setup_token_ready: boolean;
  username: string | null;
  csrf_token: string;
  server_info?: ServerSetupInfo;
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
  quota_available?: boolean;
  usage_available?: boolean;
  is_estimated?: boolean;
  inodes_used: number;
  inodes_limit: number;
  is_inodes_unmetered?: boolean;
  inodes_available?: boolean;
  inodes_usage_available?: boolean;
  inodes_quota_available?: boolean;
}

export interface MetricProcesses {
  nproc_count: number;
  nproc_limit: number;
  ep_count: number;
  ep_limit: number;
}

export interface MetricIo {
  speed_current_bytes?: number;
  speed_available?: boolean;
  speed_limit_available?: boolean;
  speed_limit_bytes: number;
  speed_limit_mb: number;
  iops_current?: number;
  iops_available?: boolean;
  iops_limit: number;
  iops_limit_available?: boolean;
}

export interface MetricBandwidth {
  used_bytes: number;
  formatted_used: string;
  limit_bytes?: number;
  formatted_limit?: string;
  quota_available?: boolean;
  is_unmetered?: boolean;
  is_available?: boolean;
}

export interface MetricLoadAvg {
  '1m': number;
  '5m': number;
  '15m': number;
}

export interface SystemInfo {
  php_version: string;
  os: string;
  is_cagefs?: boolean;
  server_time: string;
  user: string;
  web_server?: string;
  telemetry_source?: string;
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

export interface MetricHistoryPoint {
  time: string;
  timestamp: number;
  cpu: number;
  ram_mb: number;
  ram_pct: number;
  ep: number;
  nproc: number;
  io_kb: number;
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
  history?: MetricHistoryPoint[];
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

// Deployer Types
export interface DeployGitInfo {
  branch: string;
  commit: string;
  message: string;
  author: string;
  date: string;
  is_dirty: boolean;
  exists: boolean;
}

export interface DeployProject {
  id: string;
  name: string;
  description: string;
  path: string;
  deploy_script: string;
  url: string;
  type: 'astro' | 'laravel' | 'react-php';
  git: DeployGitInfo;
}

export interface DeployStatusResponse {
  id: string;
  target: string;
  status: 'running' | 'success' | 'failed';
  exit_code: number | null;
  duration: number;
  log: string;
}

// Database Types
export interface PgTableInfo {
  name: string;
  rows_estimate: number;
  size_bytes: number;
  formatted_size: string;
}

export interface PgDatabaseInfo {
  type: 'postgresql';
  database: string;
  username: string;
  host: string;
  port: number;
  connected: boolean;
  size_bytes: number;
  formatted_size: string;
  table_count: number;
  tables: PgTableInfo[];
  error?: string | null;
}

export interface MySqlDbInfo {
  database: string;
  size_bytes: number;
  formatted_size: string;
  users: string[];
  table_count: number;
}

export interface DbBackupFile {
  filename: string;
  size_bytes: number;
  formatted_size: string;
  mtime: number;
  formatted_date: string;
}

export interface DatabaseOverview {
  postgresql: PgDatabaseInfo;
  mysql: MySqlDbInfo[];
  backups: DbBackupFile[];
}

// Domains & SSL Types
export interface HttpPingResult {
  url: string;
  http_code: number;
  latency_ms: number;
  is_online: boolean;
  error?: string | null;
}

export interface DomainSslHost {
  server_name: string;
  primary_domain: string;
  type?: 'main' | 'subdomain' | 'addon' | 'domain';
  type_label?: string;
  docroot: string;
  php_version?: string;
  domains: string[];
  fqdns_count: number;
  issuer: string;
  provider: string;
  valid_from: string;
  valid_until: string;
  expires_at: number;
  days_remaining: number;
  status: 'valid' | 'expiring' | 'expired' | 'no_ssl';
  is_autossl: boolean;
  ip: string;
  http_ping: HttpPingResult;
}

// Cron Types
export interface CronJobItem {
  line_index: number;
  expression: string;
  command: string;
  human: string;
  enabled: boolean;
  comment?: string;
  raw: string;
}

// Security Audit Types
export interface SecurityFinding {
  id: string;
  severity: 'high' | 'medium' | 'good';
  title: string;
  description: string;
  path: string;
  current: string;
  recommended: string;
  can_fix: boolean;
}

export interface SecurityAuditResult {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  summary: {
    total: number;
    high: number;
    medium: number;
    good: number;
    fixable: number;
  };
  findings: SecurityFinding[];
  timestamp: number;
}
