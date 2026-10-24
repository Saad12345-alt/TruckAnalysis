import Trip from '../models/tripModel.js';
import pool from '../config/db.js';
import { reviewNewTrip, reviewEditedTrip } from '../models/routeStandardModel.js';
import { hideReview, isAdmin } from '../utils/tripReview.js';

export const getTrips = async (req, res) => {
  try {
    // Trip.findTrips() already returns { trips, totals } (totals computed
    // from the DB SUM(), or via getFallbackTotal() when falling back to
    // in-memory data) — no need to re-derive totals here.
    const { trips, totals } = await Trip.findTrips(req.query);

    // Only admins see which trips are suspicious (and why).
    return res.json({ trips: isAdmin(req) ? trips : trips.map(hideReview), totals });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    return res.json(isAdmin(req) ? trip : hideReview(trip));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createTrip = async (req, res) => {
  try {
    const { 
      date, 
      origin, 
      destination, 
      distance, 
      material, 
      revenue, 
      notes, 
      vehicle, 
      driver_name, 
      cost = {} 
    } = req.body;

    // Build base object matching PostgreSQL columns
    const body = {
      date,
      origin,
      destination,
      distance: Number(distance),
      material,
      revenue: Number(revenue),
      fuel_cost: Number(cost.fuel) || 0,
      tolls_cost: Number(cost.tolls) || 0,
      maintenance_cost: Number(cost.maintenance) || 0,
      other_cost: Number(cost.other) || 0,
      notes: notes || null,
      vehicle_id: vehicle ? Number(vehicle) : null,
      created_by: req.user.id,
    };

    // Handle driver assignment based on role
    if (req.user.role === 'driver') {
      // If user is a driver, grab their linked driver_id from the users table
      const userRes = await pool.query('SELECT driver_id FROM users WHERE id = $1', [req.user.id]);
      body.driver_id = userRes.rows[0]?.driver_id;
      
      if (!body.driver_id) {
        return res.status(400).json({ message: 'No driver profile linked to this user' });
      }
    } else {
      // If user is admin, look up the driver_id in PostgreSQL using the driver_name
      if (!driver_name) {
        return res.status(400).json({ message: 'Driver name is required' });
      }

      const driverRes = await pool.query('SELECT id FROM drivers WHERE name = $1', [driver_name]);
      
      if (driverRes.rows.length === 0) {
        return res.status(404).json({ message: `Driver "${driver_name}" not found in database` });
      }

      body.driver_id = driverRes.rows[0].id;
    }

    let newTrip = await Trip.create(body);

    // First trip on a route becomes its standard; later ones are compared to it.
    // A problem here must never stop the trip from being saved.
    try {
      await reviewNewTrip(newTrip.id);
      newTrip = (await Trip.findById(newTrip.id)) || newTrip;
    } catch (reviewError) {
      console.error('Trip review error:', reviewError);
    }

    return res.status(201).json(isAdmin(req) ? newTrip : hideReview(newTrip));
  } catch (error) {
    console.error("Trip creation error:", error);
    return res.status(500).json({ message: error.message });
  }
};


export const updateTrip = async (req, res) => {
  try {
    let updatedTrip = await Trip.update(req.params.id, req.body);

    if (!updatedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // The numbers changed, so check the trip again (never blocks the edit).
    try {
      await reviewEditedTrip(updatedTrip.id);
      updatedTrip = (await Trip.findById(updatedTrip.id)) || updatedTrip;
    } catch (reviewError) {
      console.error('Trip review error:', reviewError);
    }

    return res.json(isAdmin(req) ? updatedTrip : hideReview(updatedTrip));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const deleted = await Trip.deleteById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    return res.json({ message: 'Trip deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};