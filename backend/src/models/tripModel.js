import pool from '../config/db.js';

const baseTrip = {
  id: 1,
  date: '2026-08-15',
  origin: 'Lahore',
  destination: 'Karachi',
  distance: 1200,
  material: 'Steel',
  revenue: 200000,
  cost: { fuel: 48000, tolls: 12000, maintenance: 6000, other: 4000 },
  notes: 'Sample trip data for local development.',
  totalCost: 70000,
  profit: 130000,
  driver: { id: 10, name: 'Sample Driver' },
  vehicle: { id: 22, plate: 'ABC-123' },
};

let fallbackTrips = [baseTrip];

const toNumber = (value) => Number(value || 0);

const getFallbackTotal = (items) => {
  const totals = items.reduce(
    (acc, trip) => {
      const tripCost = Number(trip.totalCost ?? Object.values(trip.cost || {}).reduce((sum, item) => sum + Number(item || 0), 0));
      acc.revenue += Number(trip.revenue || 0);
      acc.cost += tripCost;
      acc.profit += Number(trip.profit ?? Number(trip.revenue || 0) - tripCost);
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0 }
  );

  return { revenue: totals.revenue, cost: totals.cost, profit: totals.profit };
};

const baseSelect = `
  SELECT t.*,
         json_build_object(
           'fuel', t.fuel_cost,
           'tolls', t.tolls_cost,
           'maintenance', t.maintenance_cost,
           'other', t.other_cost
         ) AS cost,
         t.total_cost AS "totalCost",
         json_build_object('id', d.id, 'name', d.name) AS driver,
         json_build_object('id', v.id, 'plate', v.plate) AS vehicle
  FROM trips t
  LEFT JOIN drivers d ON t.driver_id = d.id
  LEFT JOIN vehicles v ON t.vehicle_id = v.id
`;

const Trip = {
  async findTrips({ from, to, location } = {}) {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (from) {
        conditions.push(`t.date >= $${paramIndex++}`);
        values.push(from);
      }

      if (to) {
        conditions.push(`t.date <= $${paramIndex++}`);
        values.push(to);
      }

      if (location) {
        conditions.push(`(t.origin ILIKE $${paramIndex} OR t.destination ILIKE $${paramIndex})`);
        values.push(`%${location}%`);
        paramIndex += 1;
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows: trips } = await pool.query(
        `${baseSelect} ${whereClause} ORDER BY t.date DESC`,
        values
      );

      const { rows: totalsResult } = await pool.query(
        `SELECT
            COALESCE(SUM(t.revenue), 0) AS revenue,
            COALESCE(SUM(t.total_cost), 0) AS cost,
            COALESCE(SUM(t.profit), 0) AS profit
         FROM trips t
         ${whereClause}`,
        values
      );

      const totals = totalsResult[0] || {};

      return {
        trips,
        totals: {
          revenue: Number(totals.revenue || 0),
          cost: Number(totals.cost || 0),
          profit: Number(totals.profit || 0),
        },
      };
    } catch (error) {
      console.error('Database query error in findTrips, falling back:', error.message);

      const filteredTrips = fallbackTrips.filter((trip) => {
        const dateMatches = !from || trip.date >= from;
        const endMatches = !to || trip.date <= to;
        const locationMatches = !location || `${trip.origin} ${trip.destination}`.toLowerCase().includes(location.toLowerCase());
        return dateMatches && endMatches && locationMatches;
      });

      return {
        trips: filteredTrips,
        totals: getFallbackTotal(filteredTrips),
      };
    }
  },

  async findById(id) {
    try {
      const { rows } = await pool.query(`${baseSelect} WHERE t.id = $1`, [id]);
      return rows[0] || null;
    } catch (error) {
      return fallbackTrips.find((trip) => String(trip.id) === String(id)) || null;
    }
  },

  async create(data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

      const { rows } = await pool.query(
        `INSERT INTO trips (${keys.join(', ')}) VALUES (${placeholders}) RETURNING id`,
        values
      );

      return this.findById(rows[0].id);
    } catch (error) {
      const nextTrip = {
        ...data,
        id: Date.now(),
        totalCost: Number(data.totalCost ?? Object.values(data.cost || {}).reduce((sum, item) => sum + Number(item || 0), 0)),
        profit: Number(data.profit ?? Number(data.revenue || 0) - Number(data.totalCost || 0)),
      };

      fallbackTrips = [nextTrip, ...fallbackTrips];
      return nextTrip;
    }
  },

  async update(id, data) {
    try {
      const updateData = {};

      if (data.date !== undefined) updateData.date = data.date;
      if (data.origin !== undefined) updateData.origin = data.origin;
      if (data.destination !== undefined) updateData.destination = data.destination;
      if (data.distance !== undefined) updateData.distance = data.distance;
      if (data.material !== undefined) updateData.material = data.material;
      if (data.revenue !== undefined) updateData.revenue = data.revenue;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.vehicle_id !== undefined) updateData.vehicle_id = data.vehicle_id;
      if (data.driver_id !== undefined) updateData.driver_id = data.driver_id;

      // total_cost and profit are GENERATED ALWAYS columns — Postgres computes
      // them itself from fuel_cost/tolls_cost/maintenance_cost/other_cost and
      // revenue, and rejects any attempt to write to them directly. There's
      // also no 'cost' column — it maps to those four flat columns instead.
      if (data.cost) {
        updateData.fuel_cost = Number(data.cost.fuel) || 0;
        updateData.tolls_cost = Number(data.cost.tolls) || 0;
        updateData.maintenance_cost = Number(data.cost.maintenance) || 0;
        updateData.other_cost = Number(data.cost.other) || 0;
      }

      const keys = Object.keys(updateData);
      const values = Object.values(updateData);

      if (!keys.length) {
        return null;
      }

      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
      values.push(id);

      const { rowCount } = await pool.query(
        `UPDATE trips SET ${setClause} WHERE id = $${values.length}`,
        values
      );

      if (rowCount === 0) {
        return null;
      }

      return this.findById(id);
    } catch (error) {
      console.error('Database update error, falling back:', error.message);
      const tripIndex = fallbackTrips.findIndex((trip) => String(trip.id) === String(id));

      if (tripIndex === -1) {
        return null;
      }

      fallbackTrips[tripIndex] = {
        ...fallbackTrips[tripIndex],
        ...data,
      };

      fallbackTrips[tripIndex].totalCost = toNumber(
        fallbackTrips[tripIndex].totalCost ?? Object.values(fallbackTrips[tripIndex].cost || {}).reduce((sum, item) => sum + Number(item || 0), 0)
      );
      fallbackTrips[tripIndex].profit = toNumber(fallbackTrips[tripIndex].profit ?? Number(fallbackTrips[tripIndex].revenue || 0) - fallbackTrips[tripIndex].totalCost);

      return fallbackTrips[tripIndex];
    }
  },

  async deleteById(id) {
    try {
      const { rowCount } = await pool.query('DELETE FROM trips WHERE id = $1', [id]);
      return rowCount > 0;
    } catch (error) {
      const beforeLength = fallbackTrips.length;
      fallbackTrips = fallbackTrips.filter((trip) => String(trip.id) !== String(id));
      return beforeLength !== fallbackTrips.length;
    }
  },
};

export default Trip;