import { Router } from 'express';
import vercelController from '../controllers/vercelController.js';
import requireAuth from '../middleware/authMiddleware.js';

const router = Router();

// OAuth Connect & Callback (Callback is public for browser redirects)
router.get('/connect', requireAuth, vercelController.getOAuthUrl);
router.get('/callback', vercelController.handleOAuthCallback);

// Token connection
router.post('/token-connect', requireAuth, vercelController.connectWithToken);

// Status, verification, and disconnect
router.get('/status', requireAuth, vercelController.getVercelStatus);
router.post('/verify', requireAuth, vercelController.verifyVercel);
router.delete('/disconnect', requireAuth, vercelController.disconnectVercel);

// Projects and Teams
router.get('/projects', requireAuth, vercelController.getProjects);
router.post('/configure', requireAuth, vercelController.configureProject);

export default router;

