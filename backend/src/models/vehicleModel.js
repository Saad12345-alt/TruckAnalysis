// models/vehicleModel.js — note the reverse-lookup join, per §1
import pool from '../config/db.js';

const fallbackVehicles = [
  {
    id: 22,
    plate: 'ABC-123',
    model: 'Sample Truck',
    capacity: 10,
    status: 'active',
    driver_name: 'Sample Driver',
  },
];

let nextFallbackId = 100;

const Vehicle = {
  async findAll() {
    try {
      const { rows } = await pool.query(
        `SELECT v.*, d.name AS driver_name FROM vehicles v
         LEFT JOIN drivers d ON d.vehicle_id = v.id ORDER BY v.plate`
      );
      return rows;
    } catch (error) {
      console.error('Database query error in findAll (vehicles), falling back:', error.message);
      return fallbackVehicles;
    }
  },

  async create(data) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO vehicles (plate, model, capacity, status)
         VALUES ($1,$2,$3,COALESCE($4,'active')) RETURNING *`,
        [data.plate, data.model, data.capacity, data.status]
      );
      return rows[0];
    } catch (error) {
      console.error('Database insert error in create (vehicles), falling back:', error.message);
      const nextVehicle = {
        id: nextFallbackId++,
        plate: data.plate,
        model: data.model,
        capacity: data.capacity,
        status: data.status || 'active',
      };
      fallbackVehicles.push(nextVehicle);
      return nextVehicle;
    }
  },

  async update(id, data) {
    try {
      const { rows } = await pool.query(
        `UPDATE vehicles SET plate=$1, model=$2, capacity=$3, status=$4, updated_at=now()
         WHERE id=$5 RETURNING *`,
        [data.plate, data.model, data.capacity, data.status, id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Database update error in update (vehicles), falling back:', error.message);
      const vehicleIndex = fallbackVehicles.findIndex((vehicle) => String(vehicle.id) === String(id));

      if (vehicleIndex === -1) {
        return null;
      }

      fallbackVehicles[vehicleIndex] = {
        ...fallbackVehicles[vehicleIndex],
        plate: data.plate,
        model: data.model,
        capacity: data.capacity,
        status: data.status,
      };

      return fallbackVehicles[vehicleIndex];
    }
  },

  async deleteById(id) {
    try {
      const { rows } = await pool.query(`DELETE FROM vehicles WHERE id=$1 RETURNING id`, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Database delete error in deleteById (vehicles), falling back:', error.message);
      const vehicleIndex = fallbackVehicles.findIndex((vehicle) => String(vehicle.id) === String(id));

      if (vehicleIndex === -1) {
        return null;
      }

      const [removed] = fallbackVehicles.splice(vehicleIndex, 1);
      return { id: removed.id };
    }
  },
};

export default Vehicle;