import { Router } from 'express';
import authController from '../controllers/authController.js';
import requireAuth from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);
router.put('/settings', requireAuth, authController.updateSettings);
router.get('/activity', requireAuth, authController.getActivity);

export default router;

