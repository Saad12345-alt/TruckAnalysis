import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Vehicle } from '../types/fleet';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = (await api.get('/vehicles')) as Vehicle[];
      setVehicles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { vehicles, loading, error, refetch };
}