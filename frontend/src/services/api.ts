import {
  AuthStatus,
  MetricsData,
  FileListData,
  ProcessItem,
  LogData,
  DeployProject,
  DeployStatusResponse,
  DatabaseOverview,
  DomainSslHost,
  CronJobItem,
  SecurityAuditResult,
  MetricHistoryPoint
} from '../types';

let currentCsrfToken: string = '';

export function setCsrfToken(token: string) {
  currentCsrfToken = token;
}

export function getCsrfToken(): string {
  return currentCsrfToken;
}

// Endpoint base helper (handles either local dev or deployed subfolder)
const API_BASE = './api.php';

async function request<T>(
  action: string,
  options: {
    method?: 'GET' | 'POST';
    params?: Record<string, string | number | boolean | undefined>;
    body?: any;
    isFormData?: boolean;
  } = {}
): Promise<T> {
  const method = options.method || 'GET';
  const url = new URL(API_BASE, window.location.href);
  url.searchParams.set('action', action);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {};

  if (currentCsrfToken) {
    headers['X-CSRF-Token'] = currentCsrfToken;
  }

  let requestBody: any = null;

  if (options.isFormData && options.body instanceof FormData) {
    requestBody = options.body;
    if (currentCsrfToken) {
      requestBody.append('csrf_token', currentCsrfToken);
    }
  } else if (options.body) {
    headers['Content-Type'] = 'application/json';
    const payload = { ...options.body };
    if (currentCsrfToken && method === 'POST') {
      payload.csrf_token = currentCsrfToken;
    }
    requestBody = JSON.stringify(payload);
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: requestBody,
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data;
}

export const api = {
  checkAuth: async (): Promise<AuthStatus> => {
    const res = await request<any>('auth/check');
    if (res.csrf_token) {
      setCsrfToken(res.csrf_token);
    }
    return {
      authenticated: !!res.authenticated,
      username: res.username || null,
      csrf_token: res.csrf_token || '',
    };
  },

  login: async (username: string, password: string): Promise<any> => {
    const res = await request<any>('auth/login', {
      method: 'POST',
      body: { username, password },
    });
    if (res.data?.csrf_token) {
      setCsrfToken(res.data.csrf_token);
    }
    return res;
  },

  logout: async (): Promise<any> => {
    return request<any>('auth/logout', { method: 'POST' });
  },

  fetchStats: async (force = false): Promise<MetricsData> => {
    const res = await request<{ success: boolean; data: MetricsData }>('stats', {
      params: force ? { force: 1 } : {},
    });
    return res.data;
  },

  fetchFiles: async (path = ''): Promise<FileListData> => {
    const res = await request<{ success: boolean; data: FileListData }>('files/list', {
      params: { path },
    });
    return res.data;
  },

  readFile: async (path: string): Promise<{ path: string; name: string; content: string; size: number; extension: string }> => {
    const res = await request<any>('files/read', {
      params: { path },
    });
    return res.data;
  },

  saveFile: async (path: string, content: string): Promise<any> => {
    return request<any>('files/save', {
      method: 'POST',
      body: { path, content },
    });
  },

  createItem: async (dir: string, name: string, type: 'file' | 'dir'): Promise<any> => {
    return request<any>('files/create', {
      method: 'POST',
      body: { dir, name, type },
    });
  },

  deleteItem: async (path: string): Promise<any> => {
    return request<any>('files/delete', {
      method: 'POST',
      body: { path },
    });
  },

  renameItem: async (oldPath: string, newName: string): Promise<any> => {
    return request<any>('files/rename', {
      method: 'POST',
      body: { old_path: oldPath, new_name: newName },
    });
  },

  chmodItem: async (path: string, mode: string): Promise<any> => {
    return request<any>('files/chmod', {
      method: 'POST',
      body: { path, mode },
    });
  },

  uploadFiles: async (dir: string, fileList: FileList | File[]): Promise<any> => {
    const formData = new FormData();
    formData.append('dir', dir);
    Array.from(fileList).forEach((file) => {
      formData.append('files[]', file);
    });
    return request<any>('files/upload', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  zipItems: async (dir: string, items: string[], zipName: string): Promise<any> => {
    return request<any>('files/zip', {
      method: 'POST',
      body: { dir, items, zip_name: zipName },
    });
  },

  unzipItem: async (path: string, destDir?: string): Promise<any> => {
    return request<any>('files/unzip', {
      method: 'POST',
      body: { path, dest_dir: destDir },
    });
  },

  getDownloadUrl: (path: string): string => {
    const url = new URL(API_BASE, window.location.href);
    url.searchParams.set('action', 'files/download');
    url.searchParams.set('path', path);
    return url.toString();
  },

  fetchProcesses: async (): Promise<ProcessItem[]> => {
    const res = await request<{ success: boolean; data: ProcessItem[] }>('processes/list');
    return res.data;
  },

  killProcess: async (pid: number, signal = 15): Promise<any> => {
    return request<any>('processes/kill', {
      method: 'POST',
      body: { pid, signal },
    });
  },

  runTerminal: async (cmd: string, cwd = ''): Promise<any> => {
    return request<any>('terminal/run', {
      method: 'POST',
      body: { cmd, cwd },
    });
  },

  fetchLogs: async (type: string, lines = 100): Promise<LogData> => {
    const res = await request<{ success: boolean; data: LogData }>('logs/tail', {
      params: { type, lines },
    });
    return res.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<any> => {
    return request<any>('settings/password', {
      method: 'POST',
      body: { old_password: oldPassword, new_password: newPassword },
    });
  },

  // Deployer
  fetchDeployProjects: async (): Promise<{ projects: DeployProject[]; scripts: { deploy_all: boolean } }> => {
    return request<any>('deploy/projects');
  },

  startDeploy: async (target: string): Promise<{ deployment_id: string; status: string; target: string; message: string }> => {
    return request<any>('deploy/start', {
      method: 'POST',
      body: { target },
    });
  },

  fetchDeployStatus: async (id: string): Promise<DeployStatusResponse> => {
    return request<DeployStatusResponse>('deploy/status', {
      params: { id },
    });
  },

  // Databases
  fetchDatabaseOverview: async (): Promise<DatabaseOverview> => {
    return request<DatabaseOverview>('db/overview');
  },

  createDbBackup: async (type = 'postgresql'): Promise<any> => {
    return request<any>('db/backup', {
      method: 'POST',
      body: { type },
    });
  },

  getDbDownloadUrl: (filename: string): string => {
    const url = new URL(API_BASE, window.location.href);
    url.searchParams.set('action', 'db/download');
    url.searchParams.set('file', filename);
    return url.toString();
  },

  deleteDbBackup: async (filename: string): Promise<any> => {
    return request<any>('db/delete', {
      method: 'POST',
      body: { file: filename },
    });
  },

  // Domains & SSL
  fetchDomainsSsl: async (): Promise<{ hosts: DomainSslHost[] }> => {
    return request<any>('domains/ssl');
  },

  // Cron Manager
  fetchCronJobs: async (): Promise<{ jobs: CronJobItem[]; count: number }> => {
    return request<any>('cron/list');
  },

  addCronJob: async (expression: string, command: string, comment = ''): Promise<any> => {
    return request<any>('cron/add', {
      method: 'POST',
      body: { expression, command, comment },
    });
  },

  toggleCronJob: async (index: number): Promise<any> => {
    return request<any>('cron/toggle', {
      method: 'POST',
      body: { index },
    });
  },

  deleteCronJob: async (index: number): Promise<any> => {
    return request<any>('cron/delete', {
      method: 'POST',
      body: { index },
    });
  },

  testRunCron: async (command: string): Promise<{ exit_code: number; duration_ms: number; output: string }> => {
    return request<any>('cron/test', {
      method: 'POST',
      body: { command },
    });
  },

  // Security Auditor
  fetchSecurityAudit: async (): Promise<SecurityAuditResult> => {
    return request<SecurityAuditResult>('security/audit');
  },

  fixSecurityPermissions: async (): Promise<{ message: string; actions: string[]; audit: SecurityAuditResult }> => {
    return request<any>('security/fix', {
      method: 'POST',
    });
  },

  // Historical Metrics
  fetchMetricsHistory: async (): Promise<MetricHistoryPoint[]> => {
    const res = await request<{ success: boolean; data: MetricHistoryPoint[] }>('stats/history');
    return res.data;
  },
};
