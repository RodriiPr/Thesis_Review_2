'use client';

import type { ThesisStatus } from '../types/thesis.types';

interface Props {
  status: ThesisStatus | null;
  loading: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-gray-400' },
  GENERATING: { label: 'Generando contenido...', color: 'bg-blue-500 animate-pulse' },
  COMPLETED: { label: 'Completado', color: 'bg-green-500' },
  FAILED: { label: 'Error', color: 'bg-red-500' },
};

export default function GenerationProgress({ status, loading }: Props) {
  if (!loading && !status) return null;

  const currentStatus = status?.status ?? (loading ? 'GENERATING' : null);
  if (!currentStatus) return null;

  const info = STATUS_MAP[currentStatus] ?? { label: currentStatus, color: 'bg-gray-400' };
  const progress = currentStatus === 'COMPLETED' ? 100 : currentStatus === 'FAILED' ? 0 : 45;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${info.color}`} />
          <span className="text-sm font-medium text-gray-700">{info.label}</span>
        </div>
        {currentStatus === 'GENERATING' && (
          <span className="text-xs text-gray-400">Esto puede tomar varios minutos...</span>
        )}
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${currentStatus === 'FAILED' ? 'bg-red-400' : 'bg-[#185FA5]'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {status?.metadata && 'error' in status.metadata && (
        <p className="text-xs text-red-500 mt-1">{String(status.metadata.error)}</p>
      )}
    </div>
  );
}
