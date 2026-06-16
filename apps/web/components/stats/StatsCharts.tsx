'use client';
import React, { useEffect, useRef } from 'react';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale, ChartOptions } from 'chart.js';
import { cn } from '@/lib/utils';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend, BarController, BarElement, CategoryScale, LinearScale);

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Aprobados',
  HUMAN_REVIEW: 'En revisión',
  OBSERVED: 'Observados',
  REJECTED: 'Rechazados',
  PENDING: 'Pendientes',
  AI_PROCESSING: 'Analizando IA',
  AI_COMPLETE: 'IA completado',
};

interface StatusDatum {
  status: string;
  count: number;
}

export function StatusDoughnut({ data }: { data: StatusDatum[] | undefined }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.map((d) => STATUS_LABELS[d.status] ?? d.status);
    const values = data.map((d) => Number(d.count));

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#60A5FA'] }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' as const } } },
    });

    return () => chart.destroy();
  }, [data]);

  return <canvas ref={canvasRef} className={cn('w-full h-64')} />;
}

export function AveragesBar({ ai, human, plagiarism }: { ai?: number; human?: number; plagiarism?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['IA General', 'Puntaje Humano', 'Prom. Plagio'],
        datasets: [
          {
            label: 'Valor',
            data: [ai ?? 0, human ?? 0, plagiarism ?? 0],
            backgroundColor: ['#6366F1', '#06B6D4', '#F97316'],
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } },
      } as unknown as ChartOptions<'bar'>,
    });

    return () => chart.destroy();
  }, [ai, human, plagiarism]);

  return <canvas ref={canvasRef} className={cn('w-full h-64')} />;
}
