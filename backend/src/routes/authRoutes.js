import express from 'express';

import { getMe, login, logout, verifyToken } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.post('/logout', logout);

export default router;
