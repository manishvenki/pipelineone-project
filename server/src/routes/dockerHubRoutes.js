import { Router } from 'express';
import dockerHubController from '../controllers/dockerHubController.js';
import requireAuth from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireAuth);

router.post('/connect', dockerHubController.connectDockerHub);
router.get('/status', dockerHubController.getDockerHubStatus);
router.post('/verify', dockerHubController.verifyDockerHub);
router.delete('/disconnect', dockerHubController.disconnectDockerHub);

router.get('/repositories', dockerHubController.getRepositories);
router.get('/repositories/:namespace/:repository/tags', dockerHubController.getRepositoryTags);
router.get('/repositories/:repository/tags', (req, res, next) => {
  req.params.namespace = req.user.integrations?.dockerhub?.username || '';
  return dockerHubController.getRepositoryTags(req, res, next);
});

export default router;
