import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import logger from '../../utils/logger.js';

/**
 * Vercel Static Deployment Service
 * Packages static website output directory and deploys to Vercel Edge API.
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Recursively scans directory and collects relative file paths
 */
const collectStaticFiles = (dir, rootDir = dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // Ignore hidden files, node_modules, and git
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    if (entry.isDirectory()) {
      files.push(...collectStaticFiles(fullPath, rootDir));
    } else {
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath);
      const sha = crypto.createHash('sha1').update(content).digest('hex');
      files.push({
        path: fullPath,
        file: relativePath,
        size: content.length,
        sha,
        content,
      });
    }
  }

  return files;
};

/**
 * Deploys static build directory to Vercel via Vercel REST API
 */
export const deployToVercel = async (options) => {
  const {
    token,
    teamId,
    projectName,
    target = 'production',
    outputDirectory,
    environmentVariables = {},
  } = options;

  if (!token) {
    throw new Error('Vercel deployment failed: No Vercel authentication token provided');
  }

  if (!fs.existsSync(outputDirectory)) {
    throw new Error(`Deployment directory '${outputDirectory}' does not exist on disk`);
  }

  // 1. Collect all static files
  const files = collectStaticFiles(outputDirectory);
  if (files.length === 0) {
    throw new Error(`No static deployment files found in directory '${outputDirectory}'`);
  }

  // Ensure index.html or root entry exists
  const hasIndex = files.some((f) => f.file === 'index.html' || f.file.endsWith('/index.html'));
  if (!hasIndex) {
    logger.warn(`No index.html detected in '${outputDirectory}'. Proceeding with ${files.length} static files.`);
  }

  const client = axios.create({
    baseURL: VERCEL_API_BASE,
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PipelineOne-DevOps-Platform',
    },
    params: teamId ? { teamId } : {},
    timeout: 30000,
  });

  logger.info(`Initiating Vercel deployment for '${projectName}' (${files.length} static assets)`);

  // 2. Upload any files required by Vercel /v2/files endpoint
  for (const f of files) {
    try {
      await client.post('/v2/files', f.content, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-vercel-digest': f.sha,
          'Content-Length': f.size,
        },
      });
    } catch (err) {
      // 409 Conflict means file with this SHA already exists in Vercel's global cache, which is safe to ignore
      if (err.response && err.response.status !== 409) {
        throw new Error(`Failed to upload static file '${f.file}' to Vercel: ${err.message}`);
      }
    }
  }

  // 3. Create Deployment record via POST /v13/deployments
  const sanitizedProjectName = (projectName || 'pipeline-one-project')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-');

  const deploymentPayload = {
    name: sanitizedProjectName,
    target: target === 'preview' ? 'preview' : 'production',
    files: files.map((f) => ({
      file: f.file,
      sha: f.sha,
      size: f.size,
    })),
    projectSettings: {
      framework: null, // Pure static deployment
    },
  };

  const createRes = await client.post('/v13/deployments', deploymentPayload);
  const data = createRes.data;

  const deploymentId = data.id;
  const rawUrl = data.url;
  const deploymentUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  logger.info(`Vercel deployment created: ID ${deploymentId}, URL: ${deploymentUrl}, State: ${data.readyState || data.status}`);

  return {
    deploymentId,
    url: deploymentUrl,
    inspectorUrl: data.inspectorUrl || null,
    readyState: data.readyState || data.status || 'INITIALIZING',
    createdAt: data.createdAt || Date.now(),
  };
};

/**
 * Checks status of an existing Vercel deployment
 */
export const getDeploymentStatus = async (token, deploymentId, teamId = null) => {
  const client = axios.create({
    baseURL: VERCEL_API_BASE,
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'User-Agent': 'PipelineOne-DevOps-Platform',
    },
    params: teamId ? { teamId } : {},
    timeout: 10000,
  });

  const res = await client.get(`/v13/deployments/${encodeURIComponent(deploymentId)}`);
  const data = res.data;

  const rawUrl = data.url;
  const deploymentUrl = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`) : null;

  return {
    deploymentId: data.id,
    readyState: data.readyState || data.status, // 'BUILDING', 'READY', 'ERROR', 'CANCELED'
    url: deploymentUrl,
    createdAt: data.createdAt,
    ready: data.readyState === 'READY',
    failed: ['ERROR', 'CANCELED'].includes(data.readyState),
    errorMessage: data.errorMessage || null,
  };
};

export default {
  deployToVercel,
  getDeploymentStatus,
};
