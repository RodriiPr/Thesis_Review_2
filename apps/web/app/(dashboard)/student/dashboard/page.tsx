'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Cpu,
} from 'lucide-react';
import { PipelineStatus } from '@/components/pipeline/PipelineStatus';
import { VersionHistory } from '@/components/versions/VersionHistory';

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.FC<{ className?: string }>; className: string }
> = {
  PENDING: { label: 'Pendiente', icon: Clock, className: 'text-gray-500 bg-gray-50' },
  AI_PROCESSING: { label: 'Análisis IA...', icon: Cpu, className: 'text-purple-700 bg-purple-50' },
  AI_COMPLETE: { label: 'Listo para revisar', icon: CheckCircle2, className: 'text-blue-700 bg-blue-50' },
  HUMAN_REVIEW: { label: 'En revisión', icon: Clock, className: 'text-amber-700 bg-amber-50' },
  OBSERVED: { label: 'Observado', icon: AlertCircle, className: 'text-orange-700 bg-orange-50' },
  APPROVED: { label: 'Aprobado', icon: CheckCircle2, className: 'text-green-700 bg-green-50' },
  REJECTED: { label: 'Rechazado', icon: XCircle, className: 'text-red-700 bg-red-50' },
};

interface Advance {
  id: string;
  title: string;
  advanceType: string;
  version: number;
  status: string;
  createdAt: string;
  program: { name: string };
  aiAnalysis: { overallScore: number; gradeConverted: number } | null;
}

function GradeCircle({ score, grade, max }: { score: number; grade: number; max: number }) {
  const color = score >= 80 ? '#1D9E75' : score >= 65 ? '#BA7517' : '#E24B4A';
  return (
    <div
      className="w-12 h-12 rounded-full border-[3px] flex flex-col items-center justify-center flex-shrink-0"
      style={{ borderColor: color }}
    >
      <span className="text-sm font-semibold leading-tight" style={{ color }}>
        {grade.toFixed(0)}
      </span>
      <span className="text-[9px] text-gray-400">/{max}</span>
    </div>
  );
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const maxGrade = Number(process.env.NEXT_PUBLIC_MAX_GRADE ?? 20);

  const { data, isLoading } = useQuery({
    queryKey: ['my-advances'],
    queryFn: () => apiClient.get('/advances/mine').then((r) => r.data as Advance[]),
    refetchInterval: (query) =>
      query.state.data?.some((a: Advance) =>
        ['PENDING', 'AI_PROCESSING'].includes(a.status),
      )
        ? 8000
        : false,
  });

  const advances = data ?? [];
  const latestGrade = advances.find((a) => a.aiAnalysis)?.aiAnalysis?.gradeConverted ?? null;
  const approvedCount = advances.filter((a) => a.status === 'APPROVED').length;
  const pendingCount = advances.filter((a) =>
    ['PENDING', 'AI_PROCESSING', 'AI_COMPLETE', 'HUMAN_REVIEW'].includes(a.status),
  ).length;

  const advanceTypes = [...new Set(advances.map((a) => a.advanceType))];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Mis avances</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Seguimiento de tus avances y retroalimentación IA
          </p>
        </div>
        <Link
          href="/advances/upload"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#185FA5]
                     text-white text-sm font-medium hover:bg-[#0C447C] transition-colors"
        >
          <Upload className="w-4 h-4" />
          Nuevo avance
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-medium text-gray-900">{advances.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total enviados</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-2xl font-medium text-green-700">{approvedCount}</p>
          <p className="text-xs text-green-600 mt-0.5">Aprobados</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-medium text-gray-900">
            {latestGrade !== null ? `${latestGrade.toFixed(1)}` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Última nota IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          {pendingCount > 0 && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-3">
              <Cpu className="w-4 h-4 text-purple-600 animate-pulse flex-shrink-0" />
              <p className="text-xs text-purple-700">
                {pendingCount} avance{pendingCount > 1 ? 's' : ''} en proceso — la página se actualizará automáticamente.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : advances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600 mb-1">No tienes avances aún</p>
              <p className="text-xs text-gray-400 mb-4">
                Sube tu primer avance para recibir retroalimentación automática con IA.
              </p>
              <Link
                href="/advances/upload"
                className="inline-flex items-center gap-1.5 text-sm text-[#185FA5] hover:underline"
              >
                <Upload className="w-3.5 h-3.5" />
                Cargar primer avance
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-50">
              {advances.map((adv) => {
                const statusCfg = STATUS_CONFIG[adv.status] ?? STATUS_CONFIG['PENDING'];
                const StatusIcon = statusCfg.icon;
                return (
                  <button
                    key={adv.id}
                    type="button"
                    onClick={() => router.push(`/advances/${adv.id}/review`)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left
                               transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4.5 h-4.5 text-[#185FA5]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{adv.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {adv.program?.name} · v{adv.version} ·{' '}
                        {new Date(adv.createdAt).toLocaleDateString('es-PE')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className={cn(
                          'flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full',
                          statusCfg.className,
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>

                      {adv.aiAnalysis && (
                        <GradeCircle
                          score={adv.aiAnalysis.overallScore}
                          grade={adv.aiAnalysis.gradeConverted}
                          max={maxGrade}
                        />
                      )}

                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <PipelineStatus />

          {advanceTypes.length > 0 && (
            <VersionHistory
              advanceType={advanceTypes[0]}
              allAdvanceTypes={advanceTypes}
            />
          )}
        </div>
      </div>
    </div>
  );
}
