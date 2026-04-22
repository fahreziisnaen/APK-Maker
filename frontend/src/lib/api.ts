import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
});

export interface BuildConfig {
  appName: string;
  packageName: string;
  websiteUrl: string;
  themeColor: string;
  userAgent?: string;
  enablePullToRefresh: boolean;
  enableOfflineFallback: boolean;
  enablePushNotifications: boolean;
  buildAab: boolean;
  icon?: File;
  splash?: File;
  offlinePageHtml?: string;
}

export interface Build {
  id: string;
  status: 'PENDING' | 'QUEUED' | 'BUILDING' | 'SUCCESS' | 'FAILED';
  appName: string;
  packageName: string;
  websiteUrl: string;
  createdAt: string;
  updatedAt: string;
  logs: string[];
  errorMessage?: string;
  downloadUrl?: string;
  outputSize?: number;
}

export async function createBuild(config: BuildConfig): Promise<{ id: string; status: string }> {
  const form = new FormData();
  form.append('appName', config.appName);
  form.append('packageName', config.packageName);
  form.append('websiteUrl', config.websiteUrl);
  form.append('themeColor', config.themeColor);
  form.append('enablePullToRefresh', String(config.enablePullToRefresh));
  form.append('enableOfflineFallback', String(config.enableOfflineFallback));
  form.append('enablePushNotifications', String(config.enablePushNotifications));
  form.append('buildAab', String(config.buildAab));
  if (config.userAgent) form.append('userAgent', config.userAgent);
  if (config.offlinePageHtml) form.append('offlinePageHtml', config.offlinePageHtml);
  if (config.icon) form.append('icon', config.icon);
  if (config.splash) form.append('splash', config.splash);

  const { data } = await api.post('/builds', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getBuild(id: string): Promise<Build> {
  const { data } = await api.get(`/builds/${id}`);
  return data;
}

export async function listBuilds(): Promise<Build[]> {
  const { data } = await api.get('/builds');
  return data;
}

export async function deleteBuild(id: string): Promise<void> {
  await api.delete(`/builds/${id}`);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
