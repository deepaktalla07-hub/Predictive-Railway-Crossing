import { useQuery } from '@tanstack/react-query';
import { systemApi } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useEffect } from 'react';

export function useSystemHealth() {
  const setSystemHealth = useAppStore((s) => s.setSystemHealth);

  const query = useQuery({
    queryKey: ['system-health'],
    queryFn: systemApi.getHealth,
    refetchInterval: 30000, // Poll every 30s
    retry: 2
  });

  useEffect(() => {
    if (query.data) {
      setSystemHealth(query.data);
    }
  }, [query.data, setSystemHealth]);

  return query;
}
