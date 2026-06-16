'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { GenerateThesisDto, ThesisStatus, SyncResponse } from '../types/thesis.types';

export function useThesisGenerator() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ThesisStatus | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (dto: GenerateThesisDto) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post<SyncResponse>('/thesis-generator/sync', dto, {
        timeout: 300_000,
      });
      setStatus(data.status);
      setDownloadUrls(data.downloadUrls);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el documento';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async (id: string) => {
    const { data } = await apiClient.get<ThesisStatus>(`/thesis-generator/${id}/status`);
    setStatus(data);
    return data;
  }, []);

  const reset = useCallback(() => {
    setStatus(null);
    setDownloadUrls({});
    setError(null);
  }, []);

  return { generate, checkStatus, loading, status, downloadUrls, error, reset };
}
