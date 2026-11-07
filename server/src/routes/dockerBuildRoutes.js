import { Router } from 'express';
import dockerBuildController from '../controllers/dockerBuildController.js';
import requireAuth from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireAuth);

router.post('/builds', dockerBuildController.triggerBuild);
router.get('/builds', dockerBuildController.listBuilds);
router.get('/builds/:id', dockerBuildController.getBuild);
router.get('/builds/:id/logs', dockerBuildController.getLogs);
router.get('/builds/:id/events', dockerBuildController.streamBuildEvents);
router.post('/builds/:id/cancel', dockerBuildController.cancelBuild);
router.get('/engine', dockerBuildController.checkEngine);

export default router;
