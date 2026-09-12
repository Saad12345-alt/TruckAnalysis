import express from 'express';
import cors from 'cors';

import { getMe, login, logout, verifyToken } from './controllers/authController.js';
import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'trucksystem-backend' });
});

app.post('/login', login);
app.post('/api/login', login);
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.get('/auth/me', verifyToken, getMe);
app.post('/auth/logout', logout);
app.use('/trips', tripRoutes);
app.use('/api/trips', tripRoutes);
app.use('/drivers', driverRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/api/vehicles', vehicleRoutes);

export default app;