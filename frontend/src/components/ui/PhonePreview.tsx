'use client';
import { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, ExternalLink } from 'lucide-react';

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

function proxyUrl(url: string) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

// iPhone 14 Pro Max proportions: 430 × 932 logical px, ratio 1:2.168
// Mockup shell: 280 × 607px  →  screen area: 260 × 587px
const W = 280;
const H = 607;
const BEZEL = 10;
const SCREEN_W = W - BEZEL * 2;        // 260 px (visible)
const SCREEN_H = H - BEZEL * 2;        // 587 px (visible)
const CORNER_OUTER = 46;
const CORNER_SCREEN = 36;
// Dynamic Island
const DI_W = 80;
const DI_H = 24;
// Render the iframe at real iPhone 14 Pro Max logical width, then scale down
const RENDER_W = 430;
const SCALE = SCREEN_W / RENDER_W;                    // ≈ 0.605
const RENDER_H = Math.round(SCREEN_H / SCALE);        // ≈ 970

export function PhonePreview({ url }: PhonePreviewProps) {
  const [activeUrl, setActiveUrl] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef   = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValidHttpUrl(url)) { setStatus('idle'); setActiveUrl(''); return; }
    debounceRef.current = setTimeout(() => {
      setActiveUrl(url);
      setStatus('loading');
      setIframeKey((k) => k + 1);
    }, 900);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [url]);

  useEffect(() => {
    if (status !== 'loading') return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus('loaded'), 15000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [iframeKey, status]);

  const reload = () => { setStatus('loading'); setIframeKey((k) => k + 1); };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Live Preview</p>

      {/* ── iPhone 14 Pro Max shell ─────────────────────────── */}
      <div className="relative select-none" style={{ width: W, height: H }}>

        {/* Body */}
        <div className="absolute inset-0"
          style={{ borderRadius: CORNER_OUTER, background: '#1c1c1e', border: '2px solid #3a3a3c', boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }} />

        {/* Left — Action button + Volume up + Volume down */}
        <div className="absolute" style={{ left: -3, top: 100, width: 3, height: 32, borderRadius: '2px 0 0 2px', background: '#3a3a3c' }} />
        <div className="absolute" style={{ left: -3, top: 148, width: 3, height: 60, borderRadius: '2px 0 0 2px', background: '#3a3a3c' }} />
        <div className="absolute" style={{ left: -3, top: 218, width: 3, height: 60, borderRadius: '2px 0 0 2px', background: '#3a3a3c' }} />
        {/* Right — Power button */}
        <div className="absolute" style={{ right: -3, top: 160, width: 3, height: 80, borderRadius: '0 2px 2px 0', background: '#3a3a3c' }} />

        {/* Screen */}
        <div className="absolute overflow-hidden"
          style={{ top: BEZEL, left: BEZEL, width: SCREEN_W, height: SCREEN_H, borderRadius: CORNER_SCREEN, background: '#000' }}>

          {/* Dynamic Island */}
          <div className="absolute z-20" style={{
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            width: DI_W,
            height: DI_H,
            borderRadius: DI_H / 2,
            background: '#000',
          }} />

          {/* Content */}
          <div className="absolute inset-0">
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 bg-slate-50 px-6 text-center">
                <Smartphone size={36} className="text-slate-300" />
                <p className="text-xs text-slate-400 leading-relaxed">Enter your website URL to see a preview</p>
              </div>
            )}

            {status === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-2">
                <div className="h-7 w-7 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                <p className="text-xs text-slate-400">Loading…</p>
              </div>
            )}

            {(status === 'loading' || status === 'loaded') && activeUrl && (
              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={proxyUrl(activeUrl)}
                title="Website preview"
                onLoad={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setStatus('loaded'); }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: RENDER_W,
                  height: RENDER_H,
                  border: 'none',
                  transformOrigin: 'top left',
                  transform: `scale(${SCALE})`,
                  opacity: status === 'loaded' ? 1 : 0,
                }}
              />
            )}
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute rounded-full"
          style={{ bottom: 14, left: '50%', transform: 'translateX(-50%)', width: 100, height: 4, background: '#48484a' }} />
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
    </div>
  );
}
