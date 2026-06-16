'use client';
import React from 'react';
import { useStats } from '@/lib/hooks/useStats';
import { KPICard } from '@/components/dashboard/KPICard';
import { StatusDoughnut, AveragesBar } from '@/components/stats/StatsCharts';

export default function StatsPage() {
  const { data, isLoading } = useStats();

  const advancesByStatus = Array.isArray(data?.advancesByStatus)
    ? data.advancesByStatus.map((s: { status: string; count: string | number }) => ({ status: s.status, count: Number(s.count) }))
    : [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Estadísticas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Avances" value={isLoading ? '—' : data?.totals?.advances ?? 0} loading={isLoading} />
        <KPICard label="Revisiones" value={isLoading ? '—' : data?.totals?.reviews ?? 0} loading={isLoading} />
        <KPICard label="Concordancia IA-Humano" value={isLoading ? '—' : `${Math.round((data?.concordance?.rate ?? 0) * 100)}%`} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-1 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm text-gray-600 mb-2">Avances por estado</h2>
          <StatusDoughnut data={advancesByStatus} />
        </div>

        <div className="col-span-1 lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm text-gray-600 mb-2">Promedios</h2>
          <AveragesBar ai={data?.averages?.aiOverall ?? 0} human={data?.averages?.humanScore ?? 0} plagiarism={data?.averages?.plagiarism ?? 0} />
        </div>
      </div>
    </div>
  );
}
