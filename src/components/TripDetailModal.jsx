import React, { useState } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import './TripDetailModal.css';

const fmt = (n) => 'Rs ' + Math.round(n || 0).toLocaleString('en-US');

const emptyCost = { fuel: 0, tolls: 0, maintenance: 0, other: 0 };

// trip.date can arrive as a 'YYYY-MM-DD' string (Mongo/fallback data) or as
// a JS Date object (raw pg driver output) - handle both instead of assuming .slice() exists.
const dateStr = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

export default function TripDetailModal({ trip, role, onClose, onDeleted, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!trip) return null;

  // trip.cost is coming back undefined from the API (see chat) - default it so
  // the cost-breakdown rows below can't throw. Same idea for totalCost, which the
  // backend may still be sending as snake_case total_cost.
  const cost = { ...emptyCost, ...trip.cost };
  const totalCost =
    trip.totalCost ??
    trip.total_cost ??
    Object.values(cost).reduce((sum, v) => sum + Number(v || 0), 0);

  const startEdit = () => {
    setForm({
      date: dateStr(trip.date),
      origin: trip.origin,
      destination: trip.destination,
      distance: trip.distance,
      material: trip.material,
      revenue: trip.revenue,
      cost: { ...cost },
      notes: trip.notes || '',
    });
    setError('');
    setEditing(true);
  };

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateCost = (key, value) => setForm((f) => ({ ...f, cost: { ...f.cost, [key]: value } }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/trips/${trip.id}`, {
        ...form,
        distance: Number(form.distance),
        revenue: Number(form.revenue),
        cost: {
          fuel: Number(form.cost.fuel) || 0,
          tolls: Number(form.cost.tolls) || 0,
          maintenance: Number(form.cost.maintenance) || 0,
          other: Number(form.cost.other) || 0,
        },
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this trip? This cannot be undone.')) onDeleted(trip.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="stub-card modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <div className="eyebrow">{dateStr(trip.date)}</div>
            {!editing && (
              <h2 className="modal__title">
                {trip.origin} → {trip.destination}
              </h2>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="icon-btn">
            <X size={18} />
          </button>
        </div>

        {!editing ? (
          <>
            <div className="detail-grid">
              <div>
                <div className="field-label">DRIVER</div>
                <div>{trip.driver?.name}</div>
              </div>
              <div>
                <div className="field-label">VEHICLE</div>
                <div>{trip.vehicle?.plate}</div>
              </div>
              <div>
                <div className="field-label">MATERIAL</div>
                <div>{trip.material}</div>
              </div>
              <div>
                <div className="field-label">DISTANCE</div>
                <div>{trip.distance} km</div>
              </div>
            </div>

            <div className="cost-box">
              <div className="field-label">COST BREAKDOWN</div>
              <div className="cost-row">
                <span>Fuel</span>
                <span>{fmt(cost.fuel)}</span>
              </div>
              <div className="cost-row">
                <span>Tolls</span>
                <span>{fmt(cost.tolls)}</span>
              </div>
              <div className="cost-row">
                <span>Maintenance</span>
                <span>{fmt(cost.maintenance)}</span>
              </div>
              <div className="cost-row">
                <span>Other</span>
                <span>{fmt(cost.other)}</span>
              </div>
              <div className="cost-row cost-row--total">
                <span>Total Cost</span>
                <span>{fmt(totalCost)}</span>
              </div>
            </div>

            <div className="profit-box">
              <span>PROFIT</span>
              <span className="profit-box__value">{fmt(trip.profit)}</span>
            </div>

            {trip.notes && <p className="notes">{trip.notes}</p>}

            {role === 'ADMIN' && (
              <div className="modal__actions">
                <button className="btn-outline" onClick={startEdit}>
                  <Pencil size={13} /> EDIT
                </button>
                <button className="btn-outline btn-outline--danger" onClick={handleDelete}>
                  <Trash2 size={13} /> DELETE
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="entry-grid">
              <div>
                <label className="field-label">DATE</label>
                <input type="date" className="field-input" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
              </div>
              <div>
                <label className="field-label">DISTANCE (KM)</label>
                <input type="number" min="0" className="field-input" value={form.distance} onChange={(e) => updateField('distance', e.target.value)} />
              </div>
              <div>
                <label className="field-label">ORIGIN</label>
                <input className="field-input" value={form.origin} onChange={(e) => updateField('origin', e.target.value)} />
              </div>
              <div>
                <label className="field-label">DESTINATION</label>
                <input className="field-input" value={form.destination} onChange={(e) => updateField('destination', e.target.value)} />
              </div>
            </div>

            <div className="field-block">
              <label className="field-label">MATERIAL</label>
              <input className="field-input" value={form.material} onChange={(e) => updateField('material', e.target.value)} />
            </div>

            <div className="field-label" style={{ marginTop: 8 }}>
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
              <input type="number" min="0" className="field-input" value={form.revenue} onChange={(e) => updateField('revenue', e.target.value)} />
            </div>
            <div className="field-block">
              <label className="field-label">NOTES</label>
              <textarea className="field-input" rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="modal__actions">
              <button className="btn-outline" onClick={() => setEditing(false)} disabled={saving}>
                CANCEL
              </button>
              <button className="btn-primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'SAVING…' : 'SAVE'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}