import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Trip, TripTotals } from '../types/trip';

interface TripFilters {
  from?: string;
  to?: string;
  location?: string;
}

interface TripsResponse {
  trips: Trip[];
  totals: TripTotals;
}

export function useTrips({ from, to, location }: TripFilters = {}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [totals, setTotals] = useState<TripTotals>({ revenue: 0, cost: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (location) params.set('location', location);
      const data: TripsResponse = await api.get(`/trips?${params.toString()}`);
      setTrips(data.trips);
      setTotals(data.totals);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [from, to, location]);

  useEffect(() => {
    void Promise.resolve().then(refetch);
  }, [refetch]);

  return { trips, totals, loading, error, refetch };
}