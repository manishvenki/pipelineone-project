import { Router } from 'express';
import pipelineController from '../controllers/pipelineController.js';
import requireAuth from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireAuth);

// Configuration routes
router.get('/configurations/project/:projectId', pipelineController.getConfiguration);
router.post('/configurations', pipelineController.saveConfiguration);
router.delete('/configurations/project/:projectId', pipelineController.deleteConfiguration);

// Execution triggers & history
router.post('/:projectId/run', pipelineController.triggerRun);
router.get('/executions', pipelineController.listExecutions);
router.get('/executions/:id', pipelineController.getExecution);
router.get('/executions/:id/events', pipelineController.streamEvents);
router.post('/executions/:id/retry', pipelineController.retryRun);
router.post('/executions/:id/cancel', pipelineController.cancelRun);

export default router;

