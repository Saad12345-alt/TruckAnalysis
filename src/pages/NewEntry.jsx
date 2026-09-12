import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDrivers } from '../hooks/useDrivers';
import { useVehicles } from '../hooks/useVehicles';
import './NewEntry.css';

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  origin: '',
  destination: '',
  distance: '',
  driver_name: '',
  driver_id: '',
  vehicle: '',
  material: '',
  revenue: '',
  cost: { fuel: '', tolls: '', maintenance: '', other: '' },
  notes: '',
};

export default function NewEntry() {
  const { user } = useAuth() || {};
  const role = user?.role || 'admin';
  const { drivers } = useDrivers({ skip: role !== 'admin' });
  const { vehicles } = useVehicles();

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateCost = (key, value) => setForm((f) => ({ ...f, cost: { ...f.cost, [key]: value } }));

  const handleDriverSelection = (driverId) => {
    const selectedDriver = drivers.find((driver) => String(driver.id) === String(driverId));
    updateField('driver', driverId);
    updateField('driver_id', selectedDriver?.id ?? driverId ?? '');
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const selectedDriver = drivers.find((driver) => String(driver.id) === String(form.driver));
      const selectedDriverId = Number(form.driver_id || form.driver || user?.driver_id || 0) || null;
      const payload = {
        ...form,
        distance: Number(form.distance),
        revenue: Number(form.revenue),
        vehicle: Number(form.vehicle),
        driver_name: selectedDriver?.name || form.driver || user?.name || '',
        driver_id: selectedDriverId,
        cost: {
          fuel: Number(form.cost.fuel) || 0,
          tolls: Number(form.cost.tolls) || 0,
          maintenance: Number(form.cost.maintenance) || 0,
          other: Number(form.cost.other) || 0,
        },
      };

      if (role === 'driver') {
        delete payload.driver;
        payload.driver_id = Number(user?.driver_id || selectedDriverId || 0) || null;
      } else {
        payload.driver_name = Number(payload.driver_name) || payload.driver_name || '';
        payload.driver_id = Number(payload.driver_id);
      }

      await api.post('/trips', payload);
      setMessage('Trip logged.');
      setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page page--centered">
        <form className="stub-card entry-card" onSubmit={submit}>
          <div className="eyebrow">NEW MANIFEST</div>
          <h2 className="entry-title">LOG A TRIP</h2>

          <div className="entry-grid">
            <div>
              <label className="field-label">DATE</label>
              <input type="date" className="field-input" value={form.date} onChange={(e) => updateField('date', e.target.value)} required />
            </div>
            <div>
              <label className="field-label">DISTANCE (KM)</label>
              <input type="number" min="0" className="field-input" value={form.distance} onChange={(e) => updateField('distance', e.target.value)} required />
            </div>
            <div>
              <label className="field-label">ORIGIN</label>
              <input className="field-input" value={form.origin} onChange={(e) => updateField('origin', e.target.value)} required />
            </div>
            <div>
              <label className="field-label">DESTINATION</label>
              <input className="field-input" value={form.destination} onChange={(e) => updateField('destination', e.target.value)} required />
            </div>
          </div>

          <div className="entry-grid">
            <div>
              <label className="field-label">DRIVER</label>
              {role === 'driver' ? (
                <div className="field-input field-input--static">
                  {(user?.name || 'You (assigned)')}
                  {user?.driver_id ? ` (Driver ID: ${user.driver_id})` : ''}
                </div>
              ) : (
                <select className="field-input" value={form.driver} onChange={(e) => handleDriverSelection(e.target.value)} required>
                  <option value="" disabled>Select driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} (Driver ID: {d.id})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="field-label">VEHICLE</label>
              <select className="field-input" value={form.vehicle} onChange={(e) => updateField('vehicle', e.target.value)} required>
                <option value="" disabled>Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-block">
            <label className="field-label">MATERIAL</label>
            <input className="field-input" value={form.material} onChange={(e) => updateField('material', e.target.value)} required />
          </div>

          <div className="field-label" style={{ marginTop: 4, marginBottom: 8 }}>
            COST BREAKDOWN
          </div>
          <div className="entry-grid">
            <div>
              <label className="field-label">FUEL</label>
              <input type="number" min="0" className="field-input" value={form.cost.fuel} onChange={(e) => updateCost('fuel', e.target.value)} />
            </div>
            <div>
              <label className="field-label">TOLLS</label>
              <input type="number" min="0" className="field-input" value={form.cost.tolls} onChange={(e) => updateCost('tolls', e.target.value)} />
            </div>
            <div>
              <label className="field-label">MAINTENANCE</label>
              <input type="number" min="0" className="field-input" value={form.cost.maintenance} onChange={(e) => updateCost('maintenance', e.target.value)} />
            </div>
            <div>
              <label className="field-label">OTHER</label>
              <input type="number" min="0" className="field-input" value={form.cost.other} onChange={(e) => updateCost('other', e.target.value)} />
            </div>
          </div>

          <div className="field-block">
            <label className="field-label">REVENUE</label>
            <input type="number" min="0" className="field-input" value={form.revenue} onChange={(e) => updateField('revenue', e.target.value)} required />
          </div>
          <div className="field-block">
            <label className="field-label">NOTES</label>
            <textarea className="field-input" rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting ? 'SUBMITTING…' : 'SUBMIT MANIFEST'}
          </button>
          {message && <p className="success-msg">✓ {message}</p>}
        </form>
      </div>
    </div>
  );
}