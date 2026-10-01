import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Driver } from '../types/fleet';

interface UseDriversOptions {
  skip?: boolean;
}

export function useDrivers({ skip = false }: UseDriversOptions = {}) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<string>('');

  const refetch = useCallback(async (): Promise<void> => {
    if (skip) return;
    setLoading(true);
    setError('');
    try {
      const data = (await api.get('/drivers')) as Driver[];
      setDrivers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [skip]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { drivers, loading, error, refetch };
}