import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import dockerBuildRoutes from './routes/dockerBuildRoutes.js';
import dockerHubRoutes from './routes/dockerHubRoutes.js';
import jenkinsRoutes from './routes/jenkinsRoutes.js';
import vercelRoutes from './routes/vercelRoutes.js';
import pipelineRoutes from './routes/pipelineRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible integration previews in dashboard
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev convenience
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body and Cookie Parsers
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf ? buf.toString('utf8') : '';
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Global API rate limiting
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/projects', projectRoutes);

// Phase 2 Direct API routes
app.use('/api/docker', dockerBuildRoutes);
app.use('/api/dockerhub', dockerHubRoutes);
app.use('/api/jenkins', jenkinsRoutes);
app.use('/api/vercel', vercelRoutes);

// Phase 3 Orchestration & Webhooks routes
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/webhooks', webhookRoutes);

// Phase 4 Real-Time Monitoring, Analytics & Notifications
app.use('/api', monitoringRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Pipeline One API Service is running',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// 404 Catch-All
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;

