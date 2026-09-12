// models/driverModel.js
import pool from '../config/db.js';

const fallbackDrivers = [
  {
    id: 10,
    name: 'Sample Driver',
    phone: '+92-300-0000000',
    license_no: 'LIC-0001',
    vehicle_id: 22,
    vehicle_plate: 'ABC-123',
    status: 'active',
  },
];

let nextFallbackId = 100;

const Driver = {
  async findAll() {
    try {
      const { rows } = await pool.query(
        `SELECT d.*, v.plate AS vehicle_plate FROM drivers d
         LEFT JOIN vehicles v ON v.id = d.vehicle_id ORDER BY d.name`
      );
      return rows;
    } catch (error) {
      console.error('Database query error in findAll (drivers), falling back:', error.message);
      return fallbackDrivers;
    }
  },

  async create(data) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO drivers (name, phone, license_no, vehicle_id, status)
         VALUES ($1,$2,$3,$4,COALESCE($5,'active')) RETURNING *`,
        [data.name, data.phone, data.licenseNo, data.vehicleId || null, data.status]
      );
      return rows[0];
    } catch (error) {
      console.error('Database insert error in create (drivers), falling back:', error.message);
      const nextDriver = {
        id: nextFallbackId++,
        name: data.name,
        phone: data.phone,
        license_no: data.licenseNo,
        vehicle_id: data.vehicleId || null,
        status: data.status || 'active',
      };
      fallbackDrivers.push(nextDriver);
      return nextDriver;
    }
  },

  async update(id, data) {
    try {
      const { rows } = await pool.query(
        `UPDATE drivers SET name=$1, phone=$2, license_no=$3, vehicle_id=$4, status=$5, updated_at=now()
         WHERE id=$6 RETURNING *`,
        [data.name, data.phone, data.licenseNo, data.vehicleId || null, data.status, id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Database update error in update (drivers), falling back:', error.message);
      const driverIndex = fallbackDrivers.findIndex((driver) => String(driver.id) === String(id));

      if (driverIndex === -1) {
        return null;
      }

      fallbackDrivers[driverIndex] = {
        ...fallbackDrivers[driverIndex],
        name: data.name,
        phone: data.phone,
        license_no: data.licenseNo,
        vehicle_id: data.vehicleId || null,
        status: data.status,
      };

      return fallbackDrivers[driverIndex];
    }
  },

  async deleteById(id) {
    try {
      const { rows } = await pool.query(`DELETE FROM drivers WHERE id=$1 RETURNING id`, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Database delete error in deleteById (drivers), falling back:', error.message);
      const driverIndex = fallbackDrivers.findIndex((driver) => String(driver.id) === String(id));

      if (driverIndex === -1) {
        return null;
      }

      const [removed] = fallbackDrivers.splice(driverIndex, 1);
      return { id: removed.id };
    }
  },
};

export default Driver;