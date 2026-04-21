'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listBuilds, deleteBuild, formatBytes, Build } from '@/lib/api';
import { Loader2, Trash2, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-slate-100 text-slate-600',
  QUEUED:   'bg-blue-100 text-blue-700',
  BUILDING: 'bg-amber-100 text-amber-700',
  SUCCESS:  'bg-green-100 text-green-700',
  FAILED:   'bg-red-100 text-red-700',
};

export function BuildHistory() {
  const qc = useQueryClient();
  const { data: builds, isLoading } = useQuery<Build[]>({
    queryKey: ['builds'],
    queryFn: listBuilds,
    refetchInterval: 10_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBuild,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builds'] });
      toast.success('Build deleted');
    },
    onError: () => toast.error('Failed to delete build'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-600" size={24} />
      </div>
    );
  }

  if (!builds || builds.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
        <p className="text-lg font-medium">No builds yet</p>
        <p className="mt-1 text-sm">Start by filling in the form above</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-500">App</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">URL</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">Size</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">Created</th>
            <th className="px-4 py-3 text-right font-medium text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {builds.map((build) => (
            <tr key={build.id} className="bg-white hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <Link href={`/builds/${build.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                  {build.appName}
                </Link>
                <p className="text-xs text-slate-400">{build.packageName}</p>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <a
                  href={build.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-slate-600 hover:text-brand-600 truncate max-w-[200px]"
                >
                  {build.websiteUrl.replace(/^https?:\/\//, '')}
                  <ExternalLink size={10} />
                </a>
              </td>
              <td className="px-4 py-3">
                <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_COLORS[build.status])}>
                  {build.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                {build.outputSize ? formatBytes(build.outputSize) : '—'}
              </td>
              <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                {new Date(build.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  {build.status === 'SUCCESS' && (
                    <Link href={`/builds/${build.id}`} className="btn-secondary !py-1 !px-2.5">
                      <Download size={12} />
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this build?')) deleteMutation.mutate(build.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
