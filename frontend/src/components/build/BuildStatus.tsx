'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBuild, formatBytes, Build } from '@/lib/api';
import { Download, CheckCircle2, XCircle, Loader2, Clock, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock },
  QUEUED:   { label: 'Queued',   color: 'text-blue-600',  bg: 'bg-blue-50',   icon: Clock },
  BUILDING: { label: 'Building', color: 'text-amber-600', bg: 'bg-amber-50',  icon: Loader2 },
  SUCCESS:  { label: 'Success',  color: 'text-green-600', bg: 'bg-green-50',  icon: CheckCircle2 },
  FAILED:   { label: 'Failed',   color: 'text-red-600',   bg: 'bg-red-50',    icon: XCircle },
};

export function BuildStatus({ buildId }: { buildId: string }) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const isTerminal = (s?: string) => s === 'SUCCESS' || s === 'FAILED';

  const { data: build, refetch } = useQuery<Build>({
    queryKey: ['build', buildId],
    queryFn: () => getBuild(buildId),
    refetchInterval: (data) => isTerminal(data?.status) ? false : 3000,
  });

  // SSE for real-time log streaming
  useEffect(() => {
    if (isTerminal(build?.status)) return;
    const source = new EventSource(`/api/events/${buildId}`);
    source.addEventListener('log', (e) => {
      const { line } = JSON.parse(e.data);
      setLiveLogs((prev) => [...prev.slice(-199), line]);
    });
    source.addEventListener('status', (e) => {
      const { status } = JSON.parse(e.data);
      if (isTerminal(status)) {
        source.close();
        refetch();
      }
    });
    return () => source.close();
  }, [buildId, build?.status]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveLogs, build?.logs]);

  if (!build) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  const cfg = STATUS_CONFIG[build.status];
  const Icon = cfg.icon;
  const logs = liveLogs.length > 0 ? liveLogs : (build.logs || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to builder</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{build.appName}</h1>
          <p className="text-sm text-slate-500">{build.packageName} · {build.websiteUrl}</p>
        </div>
        <span className={clsx('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold', cfg.bg, cfg.color)}>
          <Icon size={14} className={build.status === 'BUILDING' ? 'animate-spin' : ''} />
          {cfg.label}
        </span>
      </div>

      {/* Download card */}
      {build.status === 'SUCCESS' && build.downloadUrl && (
        <div className="card border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">Your APK is ready!</h3>
              {build.outputSize && (
                <p className="text-sm text-green-600">Size: {formatBytes(build.outputSize)}</p>
              )}
            </div>
            <a
              href={build.downloadUrl}
              download
              className="btn-primary bg-green-600 hover:bg-green-700"
            >
              <Download size={16} /> Download APK
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {build.status === 'FAILED' && build.errorMessage && (
        <div className="card border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-800">Build Failed</h3>
          <p className="mt-1 text-sm text-red-600 font-mono">{build.errorMessage}</p>
          <Link href="/" className="mt-3 inline-block text-sm text-red-700 underline">
            Try again with different settings
          </Link>
        </div>
      )}

      {/* Build info */}
      <div className="card">
        <h3 className="mb-4 font-semibold text-slate-900">Build Info</h3>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          {[
            { label: 'Build ID', value: build.id },
            { label: 'Started', value: new Date(build.createdAt).toLocaleString() },
            { label: 'Updated', value: new Date(build.updatedAt).toLocaleString() },
            { label: 'Website', value: build.websiteUrl },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-slate-500">{label}</dt>
              <dd className="mt-0.5 font-medium text-slate-900 truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Build Logs</h3>
            {!isTerminal(build.status) && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="h-72 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-300">
            {logs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span className={clsx(
                  line.includes('ERROR') || line.includes('FAILED') ? 'text-red-400' :
                  line.includes('SUCCESS') ? 'text-green-400' :
                  line.includes('WARNING') ? 'text-amber-400' : ''
                )}>
                  {line}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Refresh button for non-terminal states */}
      {!isTerminal(build.status) && (
        <div className="flex justify-center">
          <button onClick={() => refetch()} className="btn-secondary gap-2">
            <RefreshCw size={14} /> Refresh Status
          </button>
        </div>
      )}
    </div>
  );
}
