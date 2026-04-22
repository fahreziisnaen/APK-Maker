'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Zap, ChevronDown, ChevronUp, X, Smartphone } from 'lucide-react';
import { createBuild, BuildConfig } from '@/lib/api';
import { ImageDropzone } from './ImageDropzone';
import clsx from 'clsx';

// iPhone 14 Pro Max proportions for the modal phone mockup
function OfflinePhoneMockup({ html }: { html: string }) {
  const W = 300, H = 622, B = 10, CR_OUT = 46, CR_SCR = 36;
  return (
    <div className="relative select-none flex-shrink-0" style={{ width: W, height: H }}>
      <div className="absolute inset-0" style={{ borderRadius: CR_OUT, background: '#1c1c1e', border: '2px solid #3a3a3c', boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)' }} />
      {/* Left buttons */}
      <div className="absolute" style={{ left: -3, top: 108, width: 3, height: 34, borderRadius: '2px 0 0 2px', background: '#3a3a3c' }} />
      <div className="absolute" style={{ left: -3, top: 158, width: 3, height: 64, borderRadius: '2px 0 0 2px', background: '#3a3a3c' }} />
      <div className="absolute" style={{ left: -3, top: 234, width: 3, height: 64, borderRadius: '2px 0 0 2px', background: '#3a3a3c' }} />
      {/* Right button */}
      <div className="absolute" style={{ right: -3, top: 172, width: 3, height: 86, borderRadius: '0 2px 2px 0', background: '#3a3a3c' }} />
      {/* Screen */}
      <div className="absolute overflow-hidden" style={{ top: B, left: B, right: B, bottom: B, borderRadius: CR_SCR, background: '#000' }}>
        {/* Dynamic Island */}
        <div className="absolute z-10" style={{ top: 11, left: '50%', transform: 'translateX(-50%)', width: 86, height: 26, borderRadius: 13, background: '#000' }} />
        <iframe
          srcDoc={html}
          title="Offline page preview"
          className="absolute inset-0 w-full h-full border-0"
          style={{ pointerEvents: 'none' }}
          sandbox="allow-scripts"
        />
      </div>
      {/* Home indicator */}
      <div className="absolute rounded-full" style={{ bottom: 14, left: '50%', transform: 'translateX(-50%)', width: 106, height: 4, background: '#48484a' }} />
    </div>
  );
}

function OfflinePageEditor({
  html, appName, themeColor, onChange, onReset,
}: {
  html: string;
  appName: string;
  themeColor: string;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  const rendered = useMemo(() => {
    const color = /^#[0-9a-fA-F]{6}$/.test(themeColor) ? themeColor : '#2563EB';
    return html
      .replace(/\{\{APP_NAME\}\}/g, appName || 'App Name')
      .replace(/\{\{THEME_COLOR\}\}/g, color);
  }, [html, appName, themeColor]);

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0" htmlFor="offlinePageHtml">Offline Page HTML</label>
        <div className="flex items-center gap-3">
          <button type="button" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            onClick={() => setShowModal(true)}>
            <Smartphone size={12} /> Preview
          </button>
          <button type="button" className="text-xs text-brand-600 hover:underline" onClick={onReset}>
            Reset to default
          </button>
        </div>
      </div>

      <textarea
        id="offlinePageHtml"
        className="input-base font-mono text-xs"
        rows={12}
        value={html}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      <p className="mt-1 text-xs text-slate-400">
        Gunakan{' '}
        <code className="bg-slate-200 px-1 rounded">{'{{APP_NAME}}'}</code> dan{' '}
        <code className="bg-slate-200 px-1 rounded">{'{{THEME_COLOR}}'}</code>{' '}
        sebagai placeholder dinamis.
      </p>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
              <p className="text-white font-semibold text-sm">Offline Page Preview</p>
              <button onClick={() => setShowModal(false)}
                className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <OfflinePhoneMockup html={rendered} />
          </div>
        </div>
      )}
    </div>
  );
}

interface PreviewState {
  url: string;
  themeColor: string;
  appName: string;
  iconSrc?: string;
}

const DEFAULT_OFFLINE_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: #f4f6fc;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .box {
      background: #fff;
      width: 100%;
      max-width: 360px;
      padding: 32px;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .title { font-size: 24px; font-weight: bold; color: #2b2b2b; margin-bottom: 8px; }
    .subtitle { font-size: 14px; color: #777; margin-bottom: 20px; }
    .msg { font-size: 15px; color: #444; margin-bottom: 24px; line-height: 1.5; }
    .btn {
      background: {{THEME_COLOR}};
      color: #fff;
      padding: 12px 28px;
      border-radius: 6px;
      font-size: 15px;
      font-weight: bold;
      border: none;
      cursor: pointer;
    }
    .footer { font-size: 12px; color: #888; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="box">
    <h1 class="title">Tidak Ada Koneksi</h1>
    <p class="subtitle">{{APP_NAME}}</p>
    <p class="msg">Pastikan koneksi internet kamu aktif,<br>lalu coba muat ulang halaman.</p>
    <button class="btn" onclick="location.reload()">Coba Lagi</button>
    <div class="footer">&copy; <span id="y"></span> {{APP_NAME}}</div>
  </div>
  <script>document.getElementById('y').textContent = new Date().getFullYear();</script>
</body>
</html>`;

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
  offlinePageHtml: DEFAULT_OFFLINE_HTML,
};

interface BuildFormProps {
  onPreviewChange?: (state: PreviewState) => void;
}

export function BuildForm({ onPreviewChange }: BuildFormProps = {}) {
  const router = useRouter();
  const [form, setForm] = useState<BuildConfig>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof BuildConfig, string>>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [iconObjectUrl, setIconObjectUrl] = useState<string | undefined>();

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
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (onPreviewChange) {
        onPreviewChange({
          url: String(next.websiteUrl || ''),
          themeColor: String(next.themeColor || '#2563EB'),
          appName: String(next.appName || ''),
          iconSrc: iconObjectUrl,
        });
      }
      return next;
    });
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
            onChange={(f) => {
              if (iconObjectUrl) URL.revokeObjectURL(iconObjectUrl);
              const objUrl = f ? URL.createObjectURL(f) : undefined;
              setIconObjectUrl(objUrl);
              set('icon', f);
              if (onPreviewChange) {
                onPreviewChange({
                  url: form.websiteUrl,
                  themeColor: form.themeColor,
                  appName: form.appName,
                  iconSrc: objUrl,
                });
              }
            }}
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

              {form.enableOfflineFallback && (
                <OfflinePageEditor
                  html={form.offlinePageHtml || ''}
                  appName={form.appName}
                  themeColor={form.themeColor}
                  onChange={(v) => set('offlinePageHtml', v)}
                  onReset={() => set('offlinePageHtml', DEFAULT_OFFLINE_HTML)}
                />
              )}
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
