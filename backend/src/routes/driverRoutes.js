import express from 'express';

import {
  createDriver,
  deleteDriver,
  getDrivers,
  updateDriver,
} from '../controllers/driverController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Fleet management is admin-only (see MVP spec assumptions) — a driver
// account never needs the full roster, only its own locked name in the
// New Entry form, which comes from the JWT, not this endpoint.
router.use(verifyToken);
router.use((req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
});

router.get('/', getDrivers);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.delete('/:id', deleteDriver);

export default router;