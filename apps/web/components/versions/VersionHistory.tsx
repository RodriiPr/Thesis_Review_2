'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ChevronDown, ChevronUp, GitBranch, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface VersionEntry {
  id: string;
  title: string;
  advanceType: string;
  version: number;
  status: string;
  createdAt: string;
  program: { name: string };
  aiAnalysis: { overallScore: number; gradeConverted: number; createdAt: string } | null;
  review: { status: string; finalGrade: number | null; reviewedAt: string } | null;
}

interface VersionHistoryProps {
  advanceType: string;
  allAdvanceTypes: string[];
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'text-gray-600 bg-gray-50' },
  AI_PROCESSING: { label: 'Procesando...', className: 'text-purple-600 bg-purple-50' },
  AI_COMPLETE: { label: 'IA lista', className: 'text-blue-600 bg-blue-50' },
  HUMAN_REVIEW: { label: 'En revisión', className: 'text-amber-600 bg-amber-50' },
  OBSERVED: { label: 'Observado', className: 'text-orange-600 bg-orange-50' },
  APPROVED: { label: 'Aprobado', className: 'text-green-600 bg-green-50' },
  REJECTED: { label: 'Rechazado', className: 'text-red-600 bg-red-50' },
};

export function VersionHistory({ advanceType, allAdvanceTypes }: VersionHistoryProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState(advanceType);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['version-history', selectedType],
    queryFn: () =>
      apiClient.get(`/advances/versions/${selectedType}`).then((r) => r.data as VersionEntry[]),
    enabled: expanded,
  });

  if (allAdvanceTypes.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <GitBranch className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Historial de versiones</span>
          {!expanded && versions.length > 0 && (
            <span className="text-[11px] text-gray-400">({versions.length} versiones)</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-300" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-300" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-50">
          {allAdvanceTypes.length > 1 && (
            <div className="flex gap-1.5 pt-3 pb-2 overflow-x-auto">
              {allAdvanceTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors',
                    selectedType === t
                      ? 'bg-[#185FA5] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              No hay versiones para &quot;{selectedType}&quot;
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-gray-100" />

              <div className="space-y-3 pt-2">
                {[...versions].reverse().map((v, idx) => {
                  const badge = STATUS_BADGE[v.status] ?? STATUS_BADGE.PENDING;
                  const isLatest = idx === 0;

                  return (
                    <div
                      key={v.id}
                      className="relative pl-9 cursor-pointer group"
                      onClick={() => router.push(`/advances/${v.id}/review`)}
                    >
                      <div
                        className={cn(
                          'absolute left-[11px] w-3 h-3 rounded-full border-2 border-white mt-1.5',
                          isLatest ? 'bg-[#185FA5]' : 'bg-gray-300',
                        )}
                      />
                      <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-900">
                                v{v.version}
                              </span>
                              {isLatest && (
                                <span className="text-[10px] text-[#185FA5] bg-blue-50 px-1.5 py-0.5 rounded-full font-medium">
                                  Actual
                                </span>
                              )}
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-full',
                                  badge.className,
                                )}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                              {new Date(v.createdAt).toLocaleDateString('es-PE', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>

                            {(v.aiAnalysis || v.review) && (
                              <div className="flex items-center gap-3 mt-1.5">
                                {v.aiAnalysis && (
                                  <span className="text-[11px] text-gray-500">
                                    Nota IA:{' '}
                                    <span className="font-medium text-gray-700">
                                      {v.aiAnalysis.gradeConverted.toFixed(1)}
                                    </span>
                                  </span>
                                )}
                                {v.review?.finalGrade && (
                                  <span className="text-[11px] text-gray-500">
                                    Nota asesor:{' '}
                                    <span className="font-medium text-gray-700">
                                      {v.review.finalGrade.toFixed(1)}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
