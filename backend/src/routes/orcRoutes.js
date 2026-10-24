import express from 'express';

import { extractFromDocument, uploadMiddleware } from '../controllers/orcController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// Same protection as the trip routes: a valid JWT is required (admin or driver).
router.use(verifyToken);
router.post('/extract', uploadMiddleware, extractFromDocument);

export default router;