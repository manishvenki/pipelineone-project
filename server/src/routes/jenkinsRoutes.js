import { Router } from 'express';
import jenkinsController from '../controllers/jenkinsController.js';
import requireAuth from '../middleware/authMiddleware.js';

const router = Router();
router.use(requireAuth);

router.post('/connect', jenkinsController.connectJenkins);
router.get('/status', jenkinsController.getJenkinsStatus);
router.post('/verify', jenkinsController.verifyJenkins);
router.delete('/disconnect', jenkinsController.disconnectJenkins);

router.get('/jobs', jenkinsController.getJobs);
router.get('/jobs/:jobName', jenkinsController.getJobDetails);

export default router;

