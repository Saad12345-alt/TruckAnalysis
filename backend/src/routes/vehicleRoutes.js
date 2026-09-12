import express from 'express';

import {
  createVehicle,
  deleteVehicle,
  getVehicles,
  updateVehicle,
} from '../controllers/vehicleController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Both roles can read the vehicle list (New Entry needs it for the vehicle
// dropdown). Managing the fleet itself stays admin-only — enforced inline
// in vehicleController.js since only some of these routes need it.
router.use(verifyToken);

router.get('/', getVehicles);
router.post('/', createVehicle);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

export default router;