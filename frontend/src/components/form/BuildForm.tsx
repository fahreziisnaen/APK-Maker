'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { createBuild, BuildConfig } from '@/lib/api';
import { ImageDropzone } from './ImageDropzone';
import clsx from 'clsx';

const DEFAULT_VALUES: BuildConfig = {
  appName: '',
  packageName: '',
  websiteUrl: '',
  themeColor: '#2563EB',
  userAgent: '',
  enablePullToRefresh: true,
  enableOfflineFallback: false,
  enablePushNotifications: false,
  buildAab: false,
};

export function BuildForm() {
  const router = useRouter();
  const [form, setForm] = useState<BuildConfig>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof BuildConfig, string>>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mutation = useMutation({
    mutationFn: createBuild,
    onSuccess: (data) => {
      toast.success('Build queued! Redirecting to status page...');
      router.push(`/builds/${data.id}`);
    },
    onError: (err: any) => {
      const details = err.response?.data?.details;
      if (details) {
        setErrors(details);
        toast.error('Please fix the errors below');
      } else {
        toast.error(err.response?.data?.error || 'Failed to start build');
      }
    },
  });

  const set = <K extends keyof BuildConfig>(key: K, value: BuildConfig[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Auto-suggest package name from URL
  const handleUrlBlur = () => {
    if (form.packageName || !form.websiteUrl) return;
    try {
      const host = new URL(form.websiteUrl).hostname
        .replace(/^www\./, '')
        .split('.')
        .reverse()
        .join('.');
      const safe = host.replace(/[^a-z0-9.]/gi, '').toLowerCase();
      if (safe) set('packageName', `${safe}.app`);
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    mutation.mutate(form);
  };

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Build Your Android App</h2>
        <p className="mt-1 text-sm text-slate-500">Fill in the details below to generate your APK</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* URL */}
        <div>
          <label className="label" htmlFor="websiteUrl">Website URL *</label>
          <input
            id="websiteUrl"
            type="url"
            className={clsx('input-base', errors.websiteUrl && '!border-red-400 !ring-red-400/20')}
            placeholder="https://yourwebsite.com"
            value={form.websiteUrl}
            onChange={(e) => set('websiteUrl', e.target.value)}
            onBlur={handleUrlBlur}
          />
          {errors.websiteUrl && <p className="error-text">{errors.websiteUrl}</p>}
        </div>

        {/* App Name + Package */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="appName">App Name *</label>
            <input
              id="appName"
              type="text"
              className={clsx('input-base', errors.appName && '!border-red-400')}
              placeholder="My Awesome App"
              maxLength={50}
              value={form.appName}
              onChange={(e) => set('appName', e.target.value)}
            />
            {errors.appName && <p className="error-text">{errors.appName}</p>}
          </div>

          <div>
            <label className="label" htmlFor="packageName">Package Name *</label>
            <input
              id="packageName"
              type="text"
              className={clsx('input-base', errors.packageName && '!border-red-400')}
              placeholder="com.example.myapp"
              value={form.packageName}
              onChange={(e) => set('packageName', e.target.value)}
            />
            {errors.packageName && <p className="error-text">{errors.packageName}</p>}
          </div>
        </div>

        {/* Theme Color */}
        <div>
          <label className="label" htmlFor="themeColor">Theme Color</label>
          <div className="flex items-center gap-3">
            <input
              id="themeColor"
              type="color"
              className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 p-1"
              value={form.themeColor}
              onChange={(e) => set('themeColor', e.target.value)}
            />
            <input
              type="text"
              className="input-base flex-1"
              value={form.themeColor}
              onChange={(e) => set('themeColor', e.target.value)}
              pattern="^#[0-9a-fA-F]{6}$"
              placeholder="#2563EB"
            />
          </div>
          {errors.themeColor && <p className="error-text">{errors.themeColor}</p>}
        </div>

        {/* Assets */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageDropzone
            label="App Icon"
            hint="512×512 PNG recommended"
            value={form.icon}
            onChange={(f) => set('icon', f)}
          />
          <ImageDropzone
            label="Splash Screen"
            hint="1080×1920 PNG recommended"
            value={form.splash}
            onChange={(f) => set('splash', f)}
          />
        </div>

        {/* Feature toggles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { key: 'enablePullToRefresh' as const, label: 'Pull to Refresh' },
            { key: 'enableOfflineFallback' as const, label: 'Offline Page' },
            { key: 'buildAab' as const, label: 'Build AAB' },
          ].map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
                checked={form[key] as boolean}
                onChange={(e) => set(key, e.target.checked)}
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>

        {/* Advanced */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="label" htmlFor="userAgent">Custom User-Agent</label>
                <input
                  id="userAgent"
                  type="text"
                  className="input-base"
                  placeholder="MyApp/1.0 (Android)"
                  maxLength={512}
                  value={form.userAgent}
                  onChange={(e) => set('userAgent', e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">Appended to the default WebView user-agent string</p>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" className="btn-primary w-full py-3" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Submitting build...</>
          ) : (
            <><Zap size={16} /> Generate APK</>
          )}
        </button>
      </form>
    </div>
  );
}
