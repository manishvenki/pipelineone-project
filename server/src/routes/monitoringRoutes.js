import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getDashboardOverview,
  getActivePipelines,
  getRecentExecutions,
  getPipelineDetails,
  getPipelineStages,
  getPipelineLogs,
  streamPipelineEvents,
} from '../controllers/monitoringController.js';

const router = express.Router();

// Apply auth to all monitoring and dashboard routes
router.use(requireAuth);

// Dashboard Overview APIs
router.get('/dashboard/overview', getDashboardOverview);
router.get('/dashboard/active-pipelines', getActivePipelines);
router.get('/dashboard/recent-executions', getRecentExecutions);

// Pipeline Monitoring APIs
router.get('/monitoring/pipelines/:id', getPipelineDetails);
router.get('/monitoring/pipelines/:id/stages', getPipelineStages);
router.get('/monitoring/pipelines/:id/logs', getPipelineLogs);
router.get('/monitoring/pipelines/:id/stream', streamPipelineEvents);

export default router;
