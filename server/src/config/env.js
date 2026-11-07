import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

// Also try loading from root directory if running from server subdirectory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const defaultKey = crypto.createHash('sha256').update('pipeline-one-default-encryption-key-for-dev').digest('hex');

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'pipeline-one-jwt-secret-key-change-in-production-min32chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || defaultKey,
  
  // PostgreSQL
  DATABASE_URL: process.env.DATABASE_URL || '',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPORT: parseInt(process.env.PGPORT, 10) || 5432,
  PGUSER: process.env.PGUSER || 'postgres',
  PGPASSWORD: process.env.PGPASSWORD || 'postgres',
  PGDATABASE: process.env.PGDATABASE || 'pipeline_one',

  // MongoDB Atlas
  MONGODB_URI: process.env.MONGODB_URI || '',

  // GitHub Integration
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/integrations/github/callback',

  // Limits
  MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 50,
};

export default env;
