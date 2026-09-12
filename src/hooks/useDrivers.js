import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// Skippable because NewEntry only needs the driver list for admins (a
// driver's own name comes from the JWT instead) — Fleet uses this without
// skip since it always needs the full roster.
export function useDrivers({ skip = false } = {}) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError('');
    try {
      setDrivers(await api.get('/drivers'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [skip]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { drivers, loading, error, refetch };
}