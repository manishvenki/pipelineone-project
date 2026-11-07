import { verifyToken } from '../utils/security.js';
import { getUserById } from '../services/authService.js';
import logger from '../utils/logger.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Bearer token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Fallback to HttpOnly cookie
    if (!token && req.cookies && req.cookies.pipeline_token) {
      token = req.cookies.pipeline_token;
    }

    // 3. Fallback to query parameter (needed for browser EventSource SSE streams)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    const user = await getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists or session has expired',
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    logger.warn('Auth verification failed:', { error: err.message });
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token',
    });
  }
};

export default requireAuth;

