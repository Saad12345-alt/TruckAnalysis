import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { findByUsername } from '../models/userModel.js';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set in the backend environment.');
}

export const login = async (req, res) => {
  const { email, username, password, role } = req.body || {};
  const loginIdentifier = email || username;

  if (!loginIdentifier || !password) {
    return res.status(400).json({ message: 'Email or username and password are required.' });
  }

  try {
    const user = await findByUsername(loginIdentifier);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        message: `Access denied. Account role is '${user.role}', not '${role}'.`,
      });
    }

    // Real DB users: 'password' holds a bcrypt hash — there's no separate
    // password_hash column in the actual schema.
    // Fallback/demo users: some carry a separate password_hash field, and a
    // couple only have a plain-text password for local convenience.
    let isMatch = false;

    if (user.password) {
      isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    }

    if (!isMatch && user.password_hash) {
      isMatch = await bcrypt.compare(password, user.password_hash).catch(() => false);
    }

    if (!isMatch && user.password) {
      isMatch = password === user.password;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = {
      id: user.id,
      username: user.username || user.email,
      email: user.email || null,
      role: user.role,
      name: user.name || null,
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: payload,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, jwtSecret, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ message: 'Token is invalid or expired' });
    }

    req.user = decodedUser;
    next();
  });
};

export const getMe = (req, res) => {
  return res.status(200).json({ user: req.user });
};

export const logout = (req, res) => {
  try {
    if (req.headers.authorization) {
      req.headers.authorization = undefined;
    }

    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};