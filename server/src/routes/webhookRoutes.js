import { Router } from 'express';
import webhookController from '../controllers/webhookController.js';

const router = Router();

// Public webhook ingestion endpoint for GitHub events
router.post('/github', webhookController.handleGithubWebhook);

export default router;
