'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatRelative } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_EVENTS: Record<string, string> = {
  PENDING: 'Avance registrado',
  AI_PROCESSING: 'Análisis IA en proceso',
  AI_COMPLETE: 'Análisis IA completado',
  HUMAN_REVIEW: 'En revisión humana',
  OBSERVED: 'Avance observado',
  APPROVED: 'Avance aprobado',
  REJECTED: 'Avance rechazado',
};

interface FeedItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  student?: { name: string };
}

export function ActivityFeedCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () =>
      apiClient.get('/advances', { params: { pageSize: 8 } }).then((r) => r.data),
    refetchInterval: 120_000,
  });

  const items: FeedItem[] = data?.advances ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-900">Actividad reciente</h2>
      </div>
      <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          ))}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin actividad reciente</p>
        )}
        {!isLoading &&
          items.map((item) => (
            <div key={item.id} className="px-5 py-3">
              <p className="text-xs font-medium text-gray-900 truncate">{item.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {STATUS_EVENTS[item.status] ?? item.status}
                {item.student?.name ? ` · ${item.student.name}` : ''}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatRelative(item.updatedAt)}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
