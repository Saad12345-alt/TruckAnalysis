import express from 'express';

import {
  createTrip,
  deleteTrip,
  getTripById,
  getTrips,
  updateTrip,
} from '../controllers/tripController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', getTrips);
router.get('/:id', getTripById);
router.post('/', createTrip);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);

export default router;