import { getDatabaseStatus } from '../config/db.js';
import { getMongoStatus } from '../config/mongo.js';
import env from '../config/env.js';

export const getHealth = (req, res) => {
  const dbStatus = getDatabaseStatus();
  const mongoStatus = getMongoStatus();

  res.status(200).json({
    success: true,
    status: 'operational',
    service: 'Pipeline One API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    databases: {
      postgresql: dbStatus,
      mongodb_atlas: mongoStatus,
    },
    integrations: {
      github_oauth_configured: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      pat_supported: true,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  });
};

export default {
  getHealth,
};
