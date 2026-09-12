import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../hooks/useTrips';
import SummaryTile from '../components/SummaryTile';
import TripCard from '../components/TripCard';
import TripDetailModal from '../components/TripDetailModal';
import Navbar from '../components/Navbar.jsx';
import TrendChart from '../components/Trendchart';
import CostBreakdownChart from '../components/Costbreakdownchart';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth() || {};
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [location, setLocation] = useState('');
  const [selected, setSelected] = useState(null);

  const { trips, totals, loading, error, refetch } = useTrips({ from, to, location });

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setLocation('');
  };

  const handleDeleted = async (id) => {
    await api.delete(`/trips/${id}`);
    setSelected(null);
    refetch();
  };

  const handleUpdated = () => {
    setSelected(null);
    refetch();
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

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="muted">Loading trips…</p>
        ) : (
          <div className="trip-list">
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} onClick={() => setSelected(t)} />
            ))}
            {trips.length === 0 && (
              <div className="stub-card empty-state">No trips match this filter. Adjust the range or clear it.</div>
            )}
          </div>
        )}

        <TripDetailModal trip={selected} role={user?.role || 'ADMIN'} onClose={() => setSelected(null)} onDeleted={handleDeleted} onUpdated={handleUpdated} />
      </div>
    </div>
  );
}