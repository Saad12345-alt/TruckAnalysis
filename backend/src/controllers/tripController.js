import Trip from '../models/tripModel.js';
import pool from '../config/db.js';

export const getTrips = async (req, res) => {
  try {
    // Trip.findTrips() already returns { trips, totals } (totals computed
    // from the DB SUM(), or via getFallbackTotal() when falling back to
    // in-memory data) — no need to re-derive totals here.
    const { trips, totals } = await Trip.findTrips(req.query);

    return res.json({ trips, totals });
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

    return res.json(trip);
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

    const newTrip = await Trip.create(body);
    return res.status(201).json(newTrip);
  } catch (error) {
    console.error("Trip creation error:", error);
    return res.status(500).json({ message: error.message });
  }
};


export const updateTrip = async (req, res) => {
  try {
    const updatedTrip = await Trip.update(req.params.id, req.body);

    if (!updatedTrip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    return res.json(updatedTrip);
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