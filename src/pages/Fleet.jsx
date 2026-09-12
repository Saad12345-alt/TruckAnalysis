import React, { useState } from 'react';
import { Truck, Users } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { useDrivers } from '../hooks/useDrivers';
import { useVehicles } from '../hooks/useVehicles';
import './Fleet.css';

const statusColorVar = {
  active: 'var(--green)',
  maintenance: 'var(--amber)',
  idle: 'var(--steel)',
  inactive: 'var(--ink-faint)',
};

function StatusBadge({ status }) {
  return (
    <span className="status-badge" style={{ color: statusColorVar[status], borderColor: statusColorVar[status] }}>
      {status.toUpperCase()}
    </span>
  );
}

export default function Fleet() {
  const [tab, setTab] = useState('drivers');
  const { drivers, loading: driversLoading, error: driversError } = useDrivers();
  const { vehicles, loading: vehiclesLoading, error: vehiclesError } = useVehicles();

  const loading = tab === 'drivers' ? driversLoading : vehiclesLoading;
  const error = tab === 'drivers' ? driversError : vehiclesError;

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page">
        <div className="fleet-tabs">
          {['drivers', 'vehicles'].map((t) => (
            <button key={t} className={`fleet-tab${tab === t ? ' fleet-tab--active' : ''}`} onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="muted">Loading fleet…</p>
        ) : (
          <div className="trip-list">
            {tab === 'drivers'
              ? drivers.map((d) => (
                  <div key={d.id} className="stub-card fleet-row">
                    <Users size={16} color="var(--steel)" />
                    <div className="fleet-row__name">{d.name}</div>
                    <div className="fleet-row__meta">{d.phone}</div>
                    <div className="fleet-row__meta">{d.vehicle_plate || '—'}</div>
                    <StatusBadge status={d.status} />
                  </div>
                ))
              : vehicles.map((v) => (
                  <div key={v.id} className="stub-card fleet-row">
                    <Truck size={16} color="var(--steel)" />
                    <div className="fleet-row__plate">{v.plate}</div>
                    <div className="fleet-row__name">{v.model}</div>
                    <div className="fleet-row__meta">{v.capacity}</div>
                    <div className="fleet-row__meta">{v.driver_name || '—'}</div>
                    <StatusBadge status={v.status} />
                  </div>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}