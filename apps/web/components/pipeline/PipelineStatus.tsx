'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Cpu, CheckCircle2, Loader2, XCircle, PauseCircle } from 'lucide-react';

interface PipelineStatus {
  queue: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused?: number;
  };
  isPaused: boolean;
  recentJobs: Array<{
    id: string;
    name: string;
    data: { advanceId: string };
    status: string;
    progress: number | object;
    failedReason: string | null;
    timestamp: number;
    finishedOn: number | null;
  }>;
}

export function PipelineStatus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pipeline-status'],
    queryFn: () => apiClient.get('/pipeline/status').then((r) => r.data as PipelineStatus),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
        <span className="text-xs text-gray-400">Estado del pipeline...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-gray-700">Pipeline IA</span>
        </div>
        <p className="text-xs text-gray-400">No disponible — Redis no conectado</p>
      </div>
    );
  }

  const totalJobs = Object.values(data.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Pipeline IA</span>
        </div>
        <div className="flex items-center gap-1.5">
          {data.isPaused ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <PauseCircle className="w-3 h-3" />
              Pausado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Activo
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {[
          { label: 'En cola', value: data.counts.waiting, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Activos', value: data.counts.active, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completados', value: data.counts.completed, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Fallidos', value: data.counts.failed, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Total', value: totalJobs, color: 'text-gray-900', bg: 'bg-white' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-lg ${stat.bg} p-2 text-center`}>
            <p className={`text-sm font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {data.recentJobs.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-500 mb-1.5">Trabajos recientes</p>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {data.recentJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-2 text-[11px] text-gray-500 py-1 px-2 rounded hover:bg-gray-50"
              >
                {job.status === 'completed' ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : job.status === 'failed' ? (
                  <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-3 h-3 text-blue-500 animate-spin flex-shrink-0" />
                )}
                <span className="flex-1 truncate">
                  {job.data?.advanceId?.slice(0, 8)}...
                </span>
                {job.finishedOn && (
                  <span className="text-[10px] text-gray-400">
                    {new Date(job.finishedOn).toLocaleTimeString('es-PE')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
