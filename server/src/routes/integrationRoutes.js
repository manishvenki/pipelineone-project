import { Router } from 'express';
import db from '../config/db.js';
import githubController from '../controllers/githubController.js';
import dockerHubRoutes from './dockerHubRoutes.js';
import jenkinsRoutes from './jenkinsRoutes.js';
import vercelRoutes from './vercelRoutes.js';
import requireAuth from '../middleware/authMiddleware.js';

const router = Router();

// 1. GitHub Integration (Phase 1)
router.get('/github/connect', requireAuth, githubController.connectGitHub);
router.get('/github/callback', githubController.handleGitHubCallback);
router.post('/github/connect-pat', requireAuth, githubController.connectWithPat);
router.get('/github/status', requireAuth, githubController.getGitHubStatus);
router.delete('/github/disconnect', requireAuth, githubController.disconnectGitHub);

// 2. Docker Hub Integration (Phase 2)
router.use('/dockerhub', dockerHubRoutes);

// 3. Jenkins Integration (Phase 2)
router.use('/jenkins', jenkinsRoutes);

// 4. Vercel Integration (Phase 2)
router.use('/vercel', vercelRoutes);

// 5. Unified Integration Status Summary for all 4 providers
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT provider, provider_username, metadata, connected_at FROM connected_integrations WHERE user_id = $1',
      [req.userId]
    );

    const integrations = {
      github: { connected: false },
      dockerhub: { connected: false },
      jenkins: { connected: false },
      vercel: { connected: false },
    };

    for (const row of intRes.rows) {
      if (integrations[row.provider] !== undefined) {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {};
        integrations[row.provider] = {
          connected: true,
          username: row.provider_username,
          connectedAt: row.connected_at,
          ...meta,
        };
      }
    }

    res.status(200).json({
      success: true,
      integrations,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
