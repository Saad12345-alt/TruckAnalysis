import pool from '../config/db.js';
import { evaluateTrip } from '../utils/tripReview.js';

// Everything that reads or writes route_standards and the review columns on trips.
// Which trips share a route is decided in SQL by norm_place() (see route_standards.sql).

const setStatus = (db, id, status, reason) =>
  db.query('UPDATE trips SET review_status = $2, flag_reason = $3 WHERE id = $1', [id, status, reason]);

const getTrip = async (db, id) =>
  (
    await db.query(
      `SELECT id, distance, total_cost, review_status,
              norm_place(origin) AS origin_key, norm_place(destination) AS destination_key
       FROM trips WHERE id = $1`,
      [id]
    )
  ).rows[0] || null;

const standardForRoute = async (db, originKey, destinationKey) =>
  (
    await db.query('SELECT * FROM route_standards WHERE origin_key = $1 AND destination_key = $2', [
      originKey,
      destinationKey,
    ])
  ).rows[0] || null;

// Re-check the trips on a route that are currently suspicious against its (new) standard.
// Trips that are normal or approved are never touched.
async function recheckSuspicious(db, standard) {
  const { rows } = await db.query(
    `SELECT id, distance, total_cost FROM trips
     WHERE review_status = 'suspicious'
       AND norm_place(origin) = $1 AND norm_place(destination) = $2`,
    [standard.origin_key, standard.destination_key]
  );
  for (const trip of rows) {
    const result = evaluateTrip(trip, standard);
    await setStatus(db, trip.id, result.suspicious ? 'suspicious' : 'normal', result.reason);
  }
}

async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// A brand-new trip: the first one on a route becomes the standard, every later one is compared to it.
export async function reviewNewTrip(tripId, db = pool) {
  // ON CONFLICT makes sure that only one of two simultaneous first trips becomes the standard.
  const created = await db.query(
    `INSERT INTO route_standards (origin_key, destination_key, distance, total_cost, source_trip_id)
     SELECT norm_place(origin), norm_place(destination), distance, total_cost, id
     FROM trips
     WHERE id = $1 AND norm_place(origin) <> '' AND norm_place(destination) <> ''
     ON CONFLICT (origin_key, destination_key) DO NOTHING
     RETURNING id`,
    [tripId]
  );
  if (created.rowCount > 0) {
    await setStatus(db, tripId, 'approved', null);
    return;
  }

  const trip = await getTrip(db, tripId);
  if (!trip) return;
  const standard = await standardForRoute(db, trip.origin_key, trip.destination_key);
  if (!standard) return; // blank route: nothing to compare with

  const result = evaluateTrip(trip, standard);
  await setStatus(db, tripId, result.suspicious ? 'suspicious' : 'normal', result.reason);
}

// A trip was edited by an admin.
export async function reviewEditedTrip(tripId) {
  return inTransaction(async (db) => {
    const trip = await getTrip(db, tripId);
    if (!trip) return;

    const owned = (await db.query('SELECT * FROM route_standards WHERE source_trip_id = $1', [tripId])).rows[0];
    let ownerMoved = false;

    if (owned) {
      if (owned.origin_key === trip.origin_key && owned.destination_key === trip.destination_key) {
        // This trip IS the standard of its route, so the standard follows the edit.
        const { rows } = await db.query(
          'UPDATE route_standards SET distance = $2, total_cost = $3, updated_at = now() WHERE id = $1 RETURNING *',
          [owned.id, trip.distance, trip.total_cost]
        );
        await recheckSuspicious(db, rows[0]);
        return;
      }
      // The route itself was changed: the old route keeps its numbers, it just loses its source trip.
      await db.query('UPDATE route_standards SET source_trip_id = NULL WHERE id = $1', [owned.id]);
      ownerMoved = true;
    }

    // An admin already vouched for an approved trip, so editing it doesn't un-approve it.
    if (trip.review_status === 'approved' && !ownerMoved) return;
    await reviewNewTrip(tripId, db);
  });
}

// Admin: "this trip is fine". The standard stays as it is.
export async function approveTrip(tripId) {
  const { rowCount } = await pool.query(
    "UPDATE trips SET review_status = 'approved', flag_reason = NULL WHERE id = $1",
    [tripId]
  );
  return rowCount > 0;
}

// Admin: "this trip's numbers are the new normal for its route".
export async function makeStandard(tripId) {
  return inTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO route_standards (origin_key, destination_key, distance, total_cost, source_trip_id)
       SELECT norm_place(origin), norm_place(destination), distance, total_cost, id
       FROM trips
       WHERE id = $1 AND norm_place(origin) <> '' AND norm_place(destination) <> ''
       ON CONFLICT (origin_key, destination_key) DO UPDATE
         SET distance = EXCLUDED.distance, total_cost = EXCLUDED.total_cost,
             source_trip_id = EXCLUDED.source_trip_id, updated_at = now()
       RETURNING *`,
      [tripId]
    );
    if (!rows.length) return false;
    await setStatus(db, tripId, 'approved', null);
    await recheckSuspicious(db, rows[0]);
    return true;
  });
}