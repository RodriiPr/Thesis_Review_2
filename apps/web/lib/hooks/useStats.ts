import { useQuery } from '@tanstack/react-query';
// Asegúrate de que la ruta de apiClient sea la correcta según tu proyecto
import { apiClient } from '../api-client'; 

export function useStats() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: async () => {
      const { data } = await apiClient.get('/stats/overview');
      return data;
    }
  });
}
