import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getAnalyticsOverview,
  getDeploymentTrends,
  getBuildPerformance,
  getProjectActivity,
} from '../controllers/analyticsController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/overview', getAnalyticsOverview);
router.get('/deployments', getDeploymentTrends);
router.get('/build-performance', getBuildPerformance);
router.get('/project-activity', getProjectActivity);

export default router;

