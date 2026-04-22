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
  const [iframeKey, setIframeKey] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'blocked'>('idle');
  const loadStartRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce URL changes 900 ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValidHttpUrl(url)) {
      setStatus('idle');
      setActiveUrl('');
      return;
    }
    debounceRef.current = setTimeout(() => {
      setActiveUrl(url);
      setStatus('loading');
      loadStartRef.current = Date.now();
      setIframeKey((k) => k + 1);
    }, 900);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [url]);

  // 7-second timeout → blocked (site never fired onLoad)
  useEffect(() => {
    if (status !== 'loading') return;
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    blockTimerRef.current = setTimeout(() => setStatus('blocked'), 7000);
    return () => { if (blockTimerRef.current) clearTimeout(blockTimerRef.current); };
  }, [iframeKey, status]);

  const handleIframeLoad = () => {
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    const elapsed = Date.now() - loadStartRef.current;
    // X-Frame-Options blocked frames load their error page in < 300 ms.
    // Real sites take longer; treat suspiciously fast loads as blocked.
    if (elapsed < 350) {
      setStatus('blocked');
    } else {
      setStatus('loaded');
    }
  };

  const reload = () => {
    setStatus('loading');
    loadStartRef.current = Date.now();
    setIframeKey((k) => k + 1);
  };

  const darken = (hex: string, amount = 0.75) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const d = (v: number) => Math.floor(v * amount).toString(16).padStart(2, '0');
      return `#${d(r)}${d(g)}${d(b)}`;
    } catch {
      return hex;
    }
  };

  const barColor = themeColor?.startsWith('#') && themeColor.length === 7 ? themeColor : '#2563EB';
  const titleBarColor = darken(barColor);

  const contentTop = 28 + (appName || activeUrl ? 42 : 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Live Preview</p>

      {/* ── Phone shell ──────────────────────────────────── */}
      <div className="relative select-none" style={{ width: 260, height: 534 }}>

        {/* Body */}
        <div className="absolute inset-0 rounded-[44px] shadow-2xl"
          style={{ background: '#1a1a1a', border: '2px solid #2e2e2e' }} />

        {/* Left buttons */}
        <div className="absolute rounded-l-sm" style={{ left: -4, top: 90,  width: 3, height: 28, background: '#444' }} />
        <div className="absolute rounded-l-sm" style={{ left: -4, top: 128, width: 3, height: 44, background: '#444' }} />
        <div className="absolute rounded-l-sm" style={{ left: -4, top: 180, width: 3, height: 44, background: '#444' }} />
        {/* Right button */}
        <div className="absolute rounded-r-sm" style={{ right: -4, top: 130, width: 3, height: 64, background: '#444' }} />

        {/* Screen */}
        <div className="absolute overflow-hidden"
          style={{ top: 10, left: 10, right: 10, bottom: 10, borderRadius: 36, background: '#fff' }}>

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 text-white shrink-0"
            style={{ height: 28, background: barColor, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
            <span>9:41</span>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#111' }} />
            <span>⚡ 100%</span>
          </div>

          {/* App title bar */}
          {(appName || activeUrl) && (
            <div className="flex items-center gap-2 px-4 shrink-0"
              style={{ height: 42, background: titleBarColor }}>
              {iconSrc && (
                <img src={iconSrc} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
              )}
              <span className="text-white font-medium truncate" style={{ fontSize: 13 }}>
                {appName || (activeUrl ? new URL(activeUrl).hostname : '')}
              </span>
            </div>
          )}

          {/* Content area */}
          <div className="absolute left-0 right-0 bottom-0 overflow-hidden"
            style={{ top: contentTop }}>

            {/* Idle */}
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 bg-slate-50 px-6 text-center">
                <Smartphone size={36} className="text-slate-300" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your website URL to see a preview
                </p>
              </div>
            )}

            {/* Loading spinner — rendered ABOVE the iframe using absolute + z */}
            {status === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-2">
                <div className="h-7 w-7 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                <p className="text-xs text-slate-400">Loading…</p>
              </div>
            )}

            {/* Blocked */}
            {status === 'blocked' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 bg-slate-50 px-6 text-center">
                <AlertCircle size={32} className="text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">Preview blocked</p>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    Site blocks embedding — your APK will open it natively in Android WebView.
                  </p>
                </div>
                <a href={activeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                  <ExternalLink size={11} /> Open in browser
                </a>
              </div>
            )}

            {/* Iframe — always below spinner; hidden while loading to prevent Chrome's
                broken-frame icon from peeking through */}
            {(status === 'loading' || status === 'loaded') && activeUrl && (
              <iframe
                key={iframeKey}
                src={activeUrl}
                title="Website preview"
                onLoad={handleIframeLoad}
                className="absolute inset-0 w-full h-full border-0"
                style={{
                  opacity: status === 'loaded' ? 1 : 0,
                  pointerEvents: status === 'loaded' ? 'auto' : 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute rounded-full"
          style={{ bottom: 16, left: '50%', transform: 'translateX(-50%)', width: 80, height: 4, background: '#444' }} />
      </div>

      {/* Controls */}
      {activeUrl && (
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button type="button" onClick={reload}
            className="flex items-center gap-1 hover:text-slate-600 transition-colors">
            <RefreshCw size={11} /> Reload
          </button>
          <span>·</span>
          <a href={activeUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-slate-600 transition-colors">
            <ExternalLink size={11} /> Open
          </a>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center" style={{ maxWidth: 220 }}>
        Some sites block embedding — the APK always opens them natively
      </p>
    </div>
  );
}
