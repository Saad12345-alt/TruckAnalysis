import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// Unlike useDrivers, no skip option — GET /vehicles is authorize('admin',
// 'driver') on the backend, since both NewEntry (either role) and Fleet
// (admin) need the vehicle list.
export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setVehicles(await api.get('/vehicles'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { vehicles, loading, error, refetch };
}