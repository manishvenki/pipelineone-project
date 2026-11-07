import { Router } from 'express';
import githubController from '../controllers/githubController.js';
import requireAuth from '../middleware/authMiddleware.js';

const router = Router();

// GitHub OAuth authorization start
router.get('/github/connect', requireAuth, githubController.connectGitHub);

// GitHub OAuth callback (accessed via browser redirect from GitHub)
router.get('/github/callback', githubController.handleGitHubCallback);

// GitHub Personal Access Token connection
router.post('/github/connect-pat', requireAuth, githubController.connectWithPat);

// GitHub status check
router.get('/github/status', requireAuth, githubController.getGitHubStatus);

// GitHub disconnect
router.delete('/github/disconnect', requireAuth, githubController.disconnectGitHub);

// Overall integrations status summary
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      integrations: user.integrations || {
        github: { connected: false },
        dockerhub: { connected: false, comingSoon: true },
        jenkins: { connected: false, comingSoon: true },
        vercel: { connected: false, comingSoon: true },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
