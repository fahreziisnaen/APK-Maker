'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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

export function PhonePreview({ url }: PhonePreviewProps) {
  const [activeUrl, setActiveUrl] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded'>('idle');
  const [isDragging, setIsDragging] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef   = useRef<HTMLIFrameElement>(null);

  // Drag-to-scroll state (not React state — no re-renders needed)
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });

  // Debounce URL changes 900ms
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

  // 15-second safety timeout
  useEffect(() => {
    if (status !== 'loading') return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus('loaded'), 15000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [iframeKey, status]);

  // Release drag if mouse leaves window
  useEffect(() => {
    const up = () => { drag.current.active = false; setIsDragging(false); };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const reload = () => { setStatus('loading'); setIframeKey((k) => k + 1); };

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (status !== 'loaded') return;
    drag.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
    setIsDragging(false);
  }, [status]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = drag.current;
    if (!d.active) return;

    const dx = d.lastX - e.clientX;
    const dy = d.lastY - e.clientY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;

    // Mark as drag after 5px movement
    if (!d.moved && (Math.abs(e.clientX - d.startX) > 5 || Math.abs(e.clientY - d.startY) > 5)) {
      d.moved = true;
      setIsDragging(true);
    }

    if (d.moved) {
      try { iframeRef.current?.contentWindow?.scrollBy(dx, dy); } catch {}
    }
  }, []);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    setIsDragging(false);

    // Short tap with no movement → forward click to element under cursor
    if (!d.moved) {
      try {
        const iframeDoc = iframeRef.current?.contentDocument;
        const iframeRect = iframeRef.current?.getBoundingClientRect();
        if (iframeDoc && iframeRect) {
          const x = e.clientX - iframeRect.left;
          const y = e.clientY - iframeRect.top;
          const el = iframeDoc.elementFromPoint(x, y) as HTMLElement | null;
          el?.click();
        }
      } catch {}
    }
  }, []);

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

          {/* Content area — fullscreen */}
          <div className="absolute inset-0 overflow-hidden">

            {/* Idle */}
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 bg-slate-50 px-6 text-center">
                <Smartphone size={36} className="text-slate-300" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your website URL to see a preview
                </p>
              </div>
            )}

            {/* Loading spinner */}
            {status === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 gap-2">
                <div className="h-7 w-7 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                <p className="text-xs text-slate-400">Loading…</p>
              </div>
            )}

            {/* Iframe */}
            {(status === 'loading' || status === 'loaded') && activeUrl && (
              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={proxyUrl(activeUrl)}
                title="Website preview"
                onLoad={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setStatus('loaded'); }}
                className="absolute inset-0 w-full h-full border-0"
                style={{ opacity: status === 'loaded' ? 1 : 0, pointerEvents: 'none' }}
              />
            )}

            {/* Drag overlay — sits above iframe, intercepts mouse for drag-scroll */}
            {status === 'loaded' && (
              <div
                className="absolute inset-0 z-20"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
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
    </div>
  );
}
