'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, XCircle, Eye, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'AI_COMPLETE', label: 'IA completado' },
  { value: 'HUMAN_REVIEW', label: 'En revisión' },
  { value: 'OBSERVED', label: 'Observados' },
];

interface Advance {
  id: string;
  title: string;
  advanceType: string;
  version: number;
  status: string;
  createdAt: string;
  student: { name: string };
  program: { name: string };
  aiAnalysis: { overallScore: number; gradeConverted: number } | null;
}

export default function BulkReviewPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('AI_COMPLETE');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['bulk-advances', filterStatus],
    queryFn: () =>
      apiClient
        .get('/advances', { params: { status: filterStatus, pageSize: 50 } })
        .then((r) => r.data),
  });

  const advances: Advance[] = data?.advances ?? [];

  const bulkMutation = useMutation({
    mutationFn: (action: 'APPROVED' | 'REJECTED' | 'OBSERVED') =>
      Promise.all(
        [...selected].map((id) => apiClient.post(`/reviews/${id}`, { status: action })),
      ),
    onSuccess: (_, action) => {
      toast.success(`${selected.size} avance${selected.size > 1 ? 's' : ''} marcados como ${action === 'APPROVED' ? 'aprobados' : action === 'REJECTED' ? 'rechazados' : 'observados'}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['bulk-advances'] });
    },
    onError: () => toast.error('Error al procesar algunos avances'),
  });

  const toggleAll = () => {
    if (selected.size === advances.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(advances.map((a) => a.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Revisión por lotes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Selecciona múltiples avances y aplica una decisión en bloque.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setFilterStatus(opt.value); setSelected(new Set()); }}
              className={cn(
                'px-4 py-2 text-sm transition-colors',
                filterStatus === opt.value
                  ? 'bg-[#185FA5] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-sm text-gray-500 ml-auto">
          {selected.size > 0 ? `${selected.size} seleccionados` : `${advances.length} avances`}
        </span>

        {selected.size > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => bulkMutation.mutate('OBSERVED')}
              disabled={bulkMutation.isPending}
              className="h-8 px-3 rounded-lg border border-amber-200 text-amber-700 text-xs
                         hover:bg-amber-50 flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Observar
            </button>
            <button
              type="button"
              onClick={() => bulkMutation.mutate('REJECTED')}
              disabled={bulkMutation.isPending}
              className="h-8 px-3 rounded-lg border border-red-200 text-red-700 text-xs
                         hover:bg-red-50 flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              Rechazar
            </button>
            <button
              type="button"
              onClick={() => bulkMutation.mutate('APPROVED')}
              disabled={bulkMutation.isPending}
              className="h-8 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs
                         flex items-center gap-1.5"
            >
              {bulkMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle2 className="w-3.5 h-3.5" />}
              Aprobar
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : advances.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
         <p className="text-sm text-gray-400">
          No hay avances con estado &quot;{STATUS_OPTIONS.find(o => o.value === filterStatus)?.label}&quot;
        </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <input
              type="checkbox"
              className="rounded border-gray-300 accent-[#185FA5]"
              checked={selected.size === advances.length && advances.length > 0}
              onChange={toggleAll}
            />
            <span className="text-xs text-gray-500 font-medium">Seleccionar todos</span>
          </div>

          <div className="divide-y divide-gray-50">
            {advances.map((adv) => {
              const score = adv.aiAnalysis?.overallScore ?? null;
              const grade = adv.aiAnalysis?.gradeConverted ?? null;
              const scoreColor = score === null ? '#888' : score >= 80 ? '#1D9E75' : score >= 65 ? '#BA7517' : '#E24B4A';

              return (
                <div
                  key={adv.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
                    selected.has(adv.id) && 'bg-blue-50/50',
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 accent-[#185FA5] flex-shrink-0"
                    checked={selected.has(adv.id)}
                    onChange={() => toggle(adv.id)}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{adv.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {adv.student.name} · {adv.program.name} · v{adv.version} ·{' '}
                      {new Date(adv.createdAt).toLocaleDateString('es-PE')}
                    </p>
                  </div>

                  {grade !== null && (
                    <div
                      className="w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center flex-shrink-0"
                      style={{ borderColor: scoreColor }}
                    >
                      <span className="text-xs font-semibold" style={{ color: scoreColor }}>
                        {grade.toFixed(0)}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => router.push(`/advances/${adv.id}/review`)}
                    className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                    title="Ver detalle"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
