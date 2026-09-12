import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// Dashboard is the only caller today, but this is separated out so the
// fetch/loading/error logic isn't tangled into that component's JSX —
// Dashboard just reads { trips, totals, loading } and renders.
export function useTrips({ from, to, location } = {}) {
  const [trips, setTrips] = useState([]);
  const [totals, setTotals] = useState({ revenue: 0, cost: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (location) params.set('location', location);
      const data = await api.get(`/trips?${params.toString()}`);
      setTrips(data.trips);
      setTotals(data.totals);
    } catch (err) 
    {
      setError(err.message);
    } 
    finally
     {
      setLoading(false);
    }
  }, [from, to, location]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Exposed so the caller can force a reload after a mutation (edit/delete/
  // add a trip) without needing to know how the fetch itself works.
  return { trips, totals, loading, error, refetch };
}