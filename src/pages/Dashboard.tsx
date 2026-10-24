import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../hooks/useTrips';
import type { Trip } from '../types/trip';
import SummaryTile from '../components/SummaryTile';
import TripCard from '../components/TripCard';
import TripDetailModal from '../components/TripDetailModal';
import Navbar from '../components/Navbar';
import TrendChart from '../components/Trendchart';
import CostBreakdownChart from '../components/Costbreakdownchart';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [location, setLocation] = useState('');
  const [selected, setSelected] = useState<Trip | null>(null);
  const [onlySuspicious, setOnlySuspicious] = useState(false);

  const { trips, totals, loading, error, refetch } = useTrips({ from, to, location });

  // Only admins are sent review_status, so the filter button is admin-only.
  const role = user?.role || 'ADMIN';
  const isAdmin = String(role).toUpperCase() === 'ADMIN';
  const suspiciousCount = trips.filter((t) => t.review_status === 'suspicious').length;
  const visibleTrips = onlySuspicious ? trips.filter((t) => t.review_status === 'suspicious') : trips;

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setLocation('');
  };

  const handleDeleted = async (id: Trip['id']): Promise<void> => {
    await api.delete(`/trips/${id}`);
    setSelected(null);
    await refetch();
  };

  const handleUpdated = (): void => {
    setSelected(null);
    void refetch();
  };

  return (
    <div className="dashboard-shell">
      <Navbar />
      <div className="page">
        <div className="stub-card filter-bar">
          <div>
            <label className="field-label">FROM</label>
            <input type="date" className="field-input" style={{ marginBottom: 0 }} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="field-label">TO</label>
            <input type="date" className="field-input" style={{ marginBottom: 0 }} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="filter-bar__search">
            <label className="field-label">LOCATION</label>
            <div className="search-input">
              <Search size={14} />
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Origin or destination" />
            </div>
          </div>
          {(from || to || location) && (
            <button className="link-btn" onClick={clearFilters}>CLEAR</button>
          )}
        </div>

        <div className="summary-grid">
          <SummaryTile label="REVENUE" value={totals.revenue} color="var(--amber)" />
          <SummaryTile label="COST" value={totals.cost} color="var(--red)" />
          <SummaryTile label="PROFIT" value={totals.profit} color="var(--green)" />
        </div>
        
        <div className="charts-section">
          <TrendChart trips={trips} />
          <CostBreakdownChart trips={trips} />
        </div>

        {isAdmin && (
          <div className="list-toolbar">
            <button
              type="button"
              className={`suspicious-chip${onlySuspicious ? ' suspicious-chip--on' : ''}`}
              aria-pressed={onlySuspicious}
              onClick={() => setOnlySuspicious((on) => !on)}
            >
              SUSPICIOUS ({suspiciousCount})
            </button>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="muted">Loading trips…</p>
        ) : (
          <div className="trip-list">
            {visibleTrips.map((t) => (
              <TripCard key={t.id} trip={t} onClick={() => setSelected(t)} />
            ))}
            {visibleTrips.length === 0 && (
              <div className="stub-card empty-state">
                {onlySuspicious && trips.length > 0
                  ? 'No suspicious trips in this range. Nice and clean.'
                  : 'No trips match this filter. Adjust the range or clear it.'}
              </div>
            )}
          </div>
        )}

        <TripDetailModal trip={selected} role={role} onClose={() => setSelected(null)} onDeleted={handleDeleted} onUpdated={handleUpdated} />
      </div>
    </div>
  );
}