import bcrypt from 'bcrypt';
import pool from '../config/db.js';


const fallbackUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@trucksystem.local',
    password: 'admin123',
    role: 'admin',
    driver_id: null,
    name: 'System Admin',
  },

  {
    id: 2,
    username: 'driver',
    email: 'driver@trucksystem.local',
    password_hash: bcrypt.hashSync('driver123', 10),
    password: 'driver123',
    role: 'driver',
    driver_id: 10,
    name: 'Sample Driver',
  },
];



export const findByUsername = async (identifier) => {
  const value = String(identifier ?? '').trim();
  if (!value) {
    return null;
  }
  try {
    const queryText = `
      SELECT id, username, email, password, role, driver_id
      FROM users
      WHERE LOWER(username) = LOWER($1)
         OR LOWER(email) = LOWER($1)
      LIMIT 1
    `;

    
    const { rows } = await pool.query(queryText, [value]);
    return rows[0] || null;

  } catch (error) {

    return fallbackUsers.find((user) => {

      const lookup = value.toLowerCase();
      return user.username.toLowerCase() === lookup || user.email.toLowerCase() === lookup;
      
    }) || null;

  }

};