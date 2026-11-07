import { Router } from 'express';
import projectController from '../controllers/projectController.js';
import requireAuth from '../middleware/authMiddleware.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadZipMiddleware } from '../middleware/upload.js';

const router = Router();

// All project routes require authentication
router.use(requireAuth);

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.delete('/:id', projectController.deleteProject);

// Upload ZIP workflow
router.post('/upload', uploadLimiter, uploadZipMiddleware.single('file'), projectController.uploadProjectZip);

// Select GitHub repository workflow
router.post('/select-repository', projectController.selectRepository);

export default router;

