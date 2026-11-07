import { Router } from 'express';
import githubController from '../controllers/githubController.js';
import requireAuth from '../middleware/authMiddleware.js';

const router = Router();

// All github exploration routes require authenticated user
router.use(requireAuth);

router.get('/repositories', githubController.getRepositories);
router.get('/repositories/:owner/:repo', githubController.getRepositoryDetails);
router.get('/repositories/:owner/:repo/branches', githubController.getRepositoryBranches);

export default router;
