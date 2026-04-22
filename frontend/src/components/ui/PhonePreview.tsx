'use client';
import { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

interface PhonePreviewProps {
  url: string;
  themeColor?: string;
  appName?: string;
  iconSrc?: string;
}

function isValidHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function PhonePreview({ url, themeColor = '#2563EB', appName, iconSrc }: PhonePreviewProps) {
  const [activeUrl, setActiveUrl] = useState('');
  const [key, setKey] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'blocked'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce URL changes by 800 ms so we don't spam iframes while typing
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isValidHttpUrl(url)) {
      setStatus('idle');
      setActiveUrl('');
      return;
    }
    timerRef.current = setTimeout(() => {
      setActiveUrl(url);
      setStatus('loading');
      setKey((k) => k + 1);
    }, 800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [url]);

  // Detect if the iframe was blocked (site sets X-Frame-Options / CSP).
  // Browsers don't fire 'error' for blocked iframes — we use a 6-second
  // timeout heuristic: if onLoad never fired, the frame was probably denied.
  useEffect(() => {
    if (status !== 'loading') return;
    const t = setTimeout(() => {
      setStatus((s) => s === 'loading' ? 'blocked' : s);
    }, 6000);
    return () => clearTimeout(t);
  }, [key, status]);

  const reload = () => {
    setStatus('loading');
    setKey((k) => k + 1);
  };

  const darken = (hex: string, amount = 0.75) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const d = (v: number) => Math.floor(v * amount).toString(16).padStart(2, '0');
    return `#${d(r)}${d(g)}${d(b)}`;
  };

  const statusBarColor = themeColor.startsWith('#') && themeColor.length === 7
    ? themeColor : '#2563EB';
  const darkColor = darken(statusBarColor);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Live Preview</p>

      {/* ─── Phone frame ─────────────────────────────────── */}
      <div className="relative select-none" style={{ width: 260, height: 534 }}>

        {/* Body */}
        <div
          className="absolute inset-0 rounded-[44px] shadow-2xl"
          style={{ background: '#1a1a1a', border: '2px solid #333' }}
        />

        {/* Side buttons left */}
        <div className="absolute rounded-l-sm" style={{ left: -4, top: 90, width: 3, height: 28, background: '#444' }} />
        <div className="absolute rounded-l-sm" style={{ left: -4, top: 128, width: 3, height: 44, background: '#444' }} />
        <div className="absolute rounded-l-sm" style={{ left: -4, top: 180, width: 3, height: 44, background: '#444' }} />
        {/* Side button right */}
        <div className="absolute rounded-r-sm" style={{ right: -4, top: 130, width: 3, height: 64, background: '#444' }} />

        {/* Screen inset */}
        <div
          className="absolute overflow-hidden"
          style={{
            top: 10, left: 10, right: 10, bottom: 10,
            borderRadius: 36,
            background: '#fff',
          }}
        >
          {/* Status bar */}
          <div
            className="flex items-center justify-between px-5 text-white"
            style={{ height: 28, background: statusBarColor, fontSize: 10 }}
          >
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>9:41</span>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#1a1a1a' }} />
            <span>⚡ 100%</span>
          </div>

          {/* App title bar */}
          {(appName || activeUrl) && (
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{ background: darkColor, minHeight: 42 }}
            >
              {iconSrc && (
                <img src={iconSrc} alt="" className="h-6 w-6 rounded-md object-cover" />
              )}
              <span className="text-white font-medium truncate" style={{ fontSize: 13 }}>
                {appName || new URL(activeUrl || 'https://x.com').hostname}
              </span>
            </div>
          )}

          {/* Content area */}
          <div className="absolute inset-0" style={{ top: 28 + ((appName || activeUrl) ? 42 : 0) }}>
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center bg-slate-50">
                <Smartphone size={36} className="text-slate-300" />
                <p className="text-xs text-slate-400">Enter a URL above to preview your app</p>
              </div>
            )}

            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
                  <p className="text-xs text-slate-400">Loading...</p>
                </div>
              </div>
            )}

            {status === 'blocked' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center bg-slate-50">
                <AlertCircle size={32} className="text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Preview blocked</p>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    This site blocks embedding — but your APK will open it natively.
                  </p>
                </div>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  <ExternalLink size={11} /> Open in browser
                </a>
              </div>
            )}

            {(status === 'loading' || status === 'loaded') && activeUrl && (
              <iframe
                key={key}
                src={activeUrl}
                title="Website preview"
                className="absolute inset-0 w-full h-full border-0"
                onLoad={() => setStatus('loaded')}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )}
          </div>
        </div>

        {/* Home indicator */}
        <div
          className="absolute rounded-full"
          style={{ bottom: 16, left: '50%', transform: 'translateX(-50%)', width: 80, height: 4, background: '#555' }}
        />
      </div>

      {/* Controls */}
      {activeUrl && (
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button
            type="button"
            onClick={reload}
            className="flex items-center gap-1 hover:text-slate-600 transition-colors"
          >
            <RefreshCw size={11} /> Reload
          </button>
          <span>·</span>
          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-slate-600 transition-colors"
          >
            <ExternalLink size={11} /> Open
          </a>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center max-w-[200px]">
        Preview uses your browser — the real APK runs natively on Android
      </p>
    </div>
  );
}
