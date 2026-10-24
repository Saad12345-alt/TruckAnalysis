import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Navbar from '../components/Navbar.jsx';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDrivers } from '../hooks/useDrivers';
import { useVehicles } from '../hooks/useVehicles';
import { buildFormPatch, labelFor } from '../utils/ocrMapping';
import './NewEntry.css';

const MAX_UPLOAD_MB = 10;

type CostKey = 'fuel' | 'tolls' | 'maintenance' | 'other';
type FormFieldKey =
  | 'date'
  | 'origin'
  | 'destination'
  | 'distance'
  | 'driver'
  | 'vehicle'
  | 'material'
  | 'revenue'
  | 'cost.fuel'
  | 'cost.tolls'
  | 'cost.maintenance'
  | 'cost.other'
  | 'notes';
type CostFieldKey = `cost.${CostKey}`;

const isCostField = (key: FormFieldKey): key is CostFieldKey => key.startsWith('cost.');

interface EntryForm {
  date: string;
  origin: string;
  destination: string;
  distance: string;
  driver_name: string;
  driver: string;
  driver_id: string | number;
  vehicle: string;
  material: string;
  revenue: string;
  cost: Record<CostKey, string>;
  notes: string;
}

interface OcrNotice {
  filled: number;
  kept: FormFieldKey[];
  warnings: string[];
  uncertain: string[];
}

type TripPayload = Omit<EntryForm, 'distance' | 'revenue' | 'vehicle' | 'cost' | 'driver_name' | 'driver_id' | 'driver'> & {
  distance: number;
  revenue: number;
  vehicle: number;
  driver_name: string | number;
  driver_id: number | null;
  driver?: string;
  cost: Record<CostKey, number>;
};

const emptyForm: EntryForm = {
  date: new Date().toISOString().slice(0, 10),
  origin: '',
  destination: '',
  distance: '',
  driver_name: '',
  driver: '',
  driver_id: '',
  vehicle: '',
  material: '',
  revenue: '',
  cost: { fuel: '', tolls: '', maintenance: '', other: '' },
  notes: '',
};

export default function NewEntry() {
  const { user } = useAuth();
  const role = user?.role || 'admin';
  const { drivers, loading: driversLoading } = useDrivers({ skip: role !== 'admin' });
  const { vehicles, loading: vehiclesLoading } = useVehicles();

  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Document upload (OCR) state
  const [uploading, setUploading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrNotice, setOcrNotice] = useState<OcrNotice | null>(null);
  const [autoFilled, setAutoFilled] = useState<FormFieldKey[]>([]);
  const userEdited = useRef(new Set<keyof EntryForm | FormFieldKey>());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const markEdited = (key: keyof EntryForm | FormFieldKey) => {
    userEdited.current.add(key);
    setAutoFilled((keys) => keys.filter((k) => k !== key));
  };
  const updateField = (key: Exclude<keyof EntryForm, 'cost'>, value: string | number) => {
    markEdited(key);
    setForm((f) => ({ ...f, [key]: String(value) }));
  };
  const updateCost = (key: CostKey, value: string) => {
    markEdited(`cost.${key}`);
    setForm((f) => ({ ...f, cost: { ...f.cost, [key]: value } }));
  };
  const auto = (key: FormFieldKey) => (autoFilled.includes(key) ? ' field-input--auto' : '');

  const handleDriverSelection = (driverId: string) => {
    const selectedDriver = drivers.find((driver) => String(driver.id) === String(driverId));
    updateField('driver', driverId);
    updateField('driver_id', selectedDriver?.id ?? driverId);
  };

  // Puts values read from the document into the form. Only fields the reader
  // actually found are touched; everything else stays as it is for manual entry.
  const applyOcrResult = (result: unknown) => {
    const { values, warnings, uncertain } = buildFormPatch(result, { drivers, vehicles, role });
    const applied: FormFieldKey[] = [];
    const kept: FormFieldKey[] = [];
    for (const key of Object.keys(values) as FormFieldKey[]) {
      (userEdited.current.has(key) ? kept : applied).push(key);
    }

    if (applied.length) {
      setForm((f) => {
        const next = { ...f, cost: { ...f.cost } };
        for (const key of applied) {
          const value = values[key] ?? '';
          if (isCostField(key)) {
            next.cost[key.slice(5) as CostKey] = value;
          } else if (key === 'driver') {
            next.driver = value;
            next.driver_id = value;
          } else {
            next[key] = value;
          }
        }
        return next;
      });
      setAutoFilled((keys) => [...new Set([...keys, ...applied])]);
    }

    setOcrNotice({
      filled: applied.length,
      kept,
      warnings,
      uncertain: uncertain.filter((key) => new Set<string>(applied).has(key)),
    });
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the user pick the same file again
    if (!file) return;

    setOcrError('');
    setOcrNotice(null);
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setOcrError(`File is too large (max ${MAX_UPLOAD_MB} MB).`);
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append(
        'hints',
        JSON.stringify({
          drivers: role === 'admin' ? drivers.map((d) => d.name) : [],
          vehicles: vehicles.map((v) => v.plate),
        })
      );
      applyOcrResult(await api.upload('/ocr/extract', body));
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : 'Could not read this document.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const selectedDriver = drivers.find((driver) => String(driver.id) === String(form.driver));
      const selectedDriverId = Number(form.driver_id || form.driver || user?.driver_id || 0) || null;
      const payload: TripPayload = {
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
      userEdited.current = new Set();
      setAutoFilled([]);
      setOcrNotice(null);
      setOcrError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit this trip.');
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

          <div className="ocr-upload">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.heic,.heif"
              onChange={handleFile}
              hidden
            />
            <button
              type="button"
              className="ocr-upload__btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || vehiclesLoading || driversLoading}
            >
              {uploading ? 'READING DOCUMENT…' : 'UPLOAD A DOCUMENT TO AUTO-FILL'}
            </button>
            <span className="ocr-upload__hint">
              Photo, scan or handwritten note · JPG, PNG, HEIC or PDF · max {MAX_UPLOAD_MB} MB
            </span>
            {ocrError && <p className="form-error">{ocrError}</p>}
            {ocrNotice && (
              <div className="ocr-notice" role="status">
                <p>
                  {ocrNotice.filled
                    ? `Filled ${ocrNotice.filled} field${ocrNotice.filled === 1 ? '' : 's'} from the document. Highlighted fields were read automatically, so please check them before submitting.`
                    : ocrNotice.kept.length
                      ? 'Everything it found was already filled in by you, so nothing was changed.'
                      : "Couldn't read any trip details from this file. Try a clearer photo, or fill the form in manually."}
                </p>
                {ocrNotice.uncertain.length > 0 && (
                  <p>Hard to read, please double-check: {ocrNotice.uncertain.map(labelFor).join(', ')}.</p>
                )}
                {ocrNotice.kept.length > 0 && ocrNotice.filled > 0 && (
                  <p>Kept what you typed in: {ocrNotice.kept.map(labelFor).join(', ')}.</p>
                )}
                {ocrNotice.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            )}
          </div>

          <div className="entry-grid">
            <div>
              <label className="field-label">DATE</label>
              <input type="date" className={`field-input${auto('date')}`} value={form.date} onChange={(e) => updateField('date', e.target.value)} required />
            </div>
            <div>
              <label className="field-label">DISTANCE (KM)</label>
              <input type="number" min="0" className={`field-input${auto('distance')}`} value={form.distance} onChange={(e) => updateField('distance', e.target.value)} required />
            </div>
            <div>
              <label className="field-label">ORIGIN</label>
              <input className={`field-input${auto('origin')}`} value={form.origin} onChange={(e) => updateField('origin', e.target.value)} required />
            </div>
            <div>
              <label className="field-label">DESTINATION</label>
              <input className={`field-input${auto('destination')}`} value={form.destination} onChange={(e) => updateField('destination', e.target.value)} required />
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
                <select className={`field-input${auto('driver')}`} value={form.driver} onChange={(e) => handleDriverSelection(e.target.value)} required>
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
              <select className={`field-input${auto('vehicle')}`} value={form.vehicle} onChange={(e) => updateField('vehicle', e.target.value)} required>
                <option value="" disabled>Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-block">
            <label className="field-label">MATERIAL</label>
            <input className={`field-input${auto('material')}`} value={form.material} onChange={(e) => updateField('material', e.target.value)} required />
          </div>

          <div className="field-label" style={{ marginTop: 4, marginBottom: 8 }}>
            COST BREAKDOWN
          </div>
          <div className="entry-grid">
            <div>
              <label className="field-label">FUEL</label>
              <input type="number" min="0" className={`field-input${auto('cost.fuel')}`} value={form.cost.fuel} onChange={(e) => updateCost('fuel', e.target.value)} />
            </div>
            <div>
              <label className="field-label">TOLLS</label>
              <input type="number" min="0" className={`field-input${auto('cost.tolls')}`} value={form.cost.tolls} onChange={(e) => updateCost('tolls', e.target.value)} />
            </div>
            <div>
              <label className="field-label">MAINTENANCE</label>
              <input type="number" min="0" className={`field-input${auto('cost.maintenance')}`} value={form.cost.maintenance} onChange={(e) => updateCost('maintenance', e.target.value)} />
            </div>
            <div>
              <label className="field-label">OTHER</label>
              <input type="number" min="0" className={`field-input${auto('cost.other')}`} value={form.cost.other} onChange={(e) => updateCost('other', e.target.value)} />
            </div>
          </div>

          <div className="field-block">
            <label className="field-label">REVENUE</label>
            <input type="number" min="0" className={`field-input${auto('revenue')}`} value={form.revenue} onChange={(e) => updateField('revenue', e.target.value)} required />
          </div>
          <div className="field-block">
            <label className="field-label">NOTES</label>
            <textarea className={`field-input${auto('notes')}`} rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
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