// Turns the OCR response into values for the New Entry form.
// Pure functions (no React) so they are easy to test.
//
// Form keys used below match NewEntry's state: 'date', 'origin', 'destination',
// 'distance', 'driver' (the <select> value = driver id), 'vehicle' (vehicle id),
// 'material', 'revenue', 'notes' and 'cost.fuel' / 'cost.tolls' / 'cost.maintenance' / 'cost.other'.

const FIELD_LABELS = {
  date: 'Date',
  origin: 'Origin',
  destination: 'Destination',
  distance: 'Distance',
  driver: 'Driver',
  vehicle: 'Vehicle',
  material: 'Material',
  revenue: 'Revenue',
  'cost.fuel': 'Fuel',
  'cost.tolls': 'Tolls',
  'cost.maintenance': 'Maintenance',
  'cost.other': 'Other cost',
  notes: 'Notes',
};

/** @typedef {import('../types/fleet').Driver} Driver */
/** @typedef {import('../types/fleet').Vehicle} Vehicle */
/** @typedef {'date' | 'origin' | 'destination' | 'distance' | 'driver' | 'vehicle' | 'material' | 'revenue' | 'cost.fuel' | 'cost.tolls' | 'cost.maintenance' | 'cost.other' | 'notes'} FormFieldKey */

// The OCR response calls these differently from the form (the form stores ids).
const OCR_TO_FORM_KEY = { driver_name: 'driver', vehicle_plate: 'vehicle' };

export const labelFor = (key) => FIELD_LABELS[key] || key;

const words = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const plateKey = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
/** @template T @param {T[]} list @returns {T | null} */
const onlyOne = (list) => (list.length === 1 ? list[0] : null);

// Returns the driver only when exactly one driver matches, so an ambiguous
// name ("Ali" with two Alis in the fleet) is left for the user to pick.
/** @param {string} name @param {Driver[]} drivers @returns {Driver | null} */
export function matchDriver(name, drivers) {
  const q = words(name);
  if (!q.length) return null;

  const exact = drivers.filter((d) => words(d.name).join(' ') === q.join(' '));
  if (exact.length) return onlyOne(exact);

  if (q.join('').length < 3) return null;
  const within = (a, b) => a.every((w) => b.includes(w));
  return onlyOne(
    drivers.filter((d) => {
      const w = words(d.name);
      return w.length > 0 && (within(q, w) || within(w, q));
    })
  );
}

// "LEA 1234", "lea-1234" and "LEA1234" are the same plate.
/** @param {string} plate @param {Vehicle[]} vehicles @returns {Vehicle | null} */
export function matchVehicle(plate, vehicles) {
  const key = plateKey(plate);
  if (!key) return null;
  return onlyOne(vehicles.filter((v) => plateKey(v.plate) === key));
}

function isRealIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// result: the JSON returned by POST /ocr/extract.
// Returns:
//   values   - { formKey: stringValue } for everything that was read AND is usable
//   warnings - messages to show the user (unmatched driver/vehicle, several trips)
//   uncertain- form keys the reader said it was unsure about
/**
 * @param {unknown} result
 * @param {{ drivers?: Driver[], vehicles?: Vehicle[], role?: string }} [options]
 * @returns {{ values: Partial<Record<FormFieldKey, string>>, warnings: string[], uncertain: string[] }}
 */
export function buildFormPatch(result, { drivers = [], vehicles = [], role = 'admin' } = {}) {
  const f = result?.fields || {};
  const c = f.cost || {};
  const values = {};
  const warnings = [];

  const text = (v, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? String(v) : null);
  const put = (key, v) => {
    if (v !== null) values[key] = v;
  };

  const date = text(f.date, 10);
  if (date && isRealIsoDate(date)) values.date = date;

  put('origin', text(f.origin));
  put('destination', text(f.destination));
  put('distance', num(f.distance));
  put('material', text(f.material));
  put('revenue', num(f.revenue));
  put('cost.fuel', num(c.fuel));
  put('cost.tolls', num(c.tolls));
  put('cost.maintenance', num(c.maintenance));
  put('cost.other', num(c.other));
  put('notes', text(f.notes, 1000));

  // Drivers log their own trips, so there is no driver picker to fill for them.
  const driverName = text(f.driver_name, 100);
  if (driverName && role !== 'driver') {
    const driver = matchDriver(driverName, drivers);
    if (driver) values.driver = String(driver.id);
    else warnings.push(`Driver "${driverName}" was read from the document but isn't in your driver list. Please select one.`);
  }

  const plate = text(f.vehicle_plate, 30);
  if (plate) {
    const vehicle = matchVehicle(plate, vehicles);
    if (vehicle) values.vehicle = String(vehicle.id);
    else warnings.push(`Vehicle "${plate}" was read from the document but isn't in your vehicle list. Please select one.`);
  }

  if (result?.multiple_trips === true) {
    warnings.push('This document seems to list more than one trip. Only the first one was read.');
  }

  const uncertain = (Array.isArray(result?.uncertain) ? result.uncertain : [])
    .map((k) => OCR_TO_FORM_KEY[k] || k)
    .filter((k) => k in values);

  return { values, warnings, uncertain };
}