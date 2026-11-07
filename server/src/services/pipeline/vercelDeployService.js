import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import logger from '../../utils/logger.js';

/**
 * Vercel Deployment Service
 * Connects GitHub Repository to Vercel Git Integration, triggers native builds,
 * or packages verified static site assets directly to Vercel Edge CDN.
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Sanitize project name for Vercel slug conventions
 */
export const sanitizeProjectName = (name) => {
  return (name || 'pipeline-one-project')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
};

/**
 * Checks if a project exists in Vercel or creates/links it with GitHub integration
 */
export const createOrLinkVercelProject = async ({
  token,
  teamId = null,
  projectName,
  repoFullName = null,
  framework = null,
  buildCommand = null,
  outputDirectory = null,
  rootDirectory = null,
}) => {
  if (!token) {
    throw new Error('Vercel project link failed: No Vercel authentication token provided');
  }

  const client = axios.create({
    baseURL: VERCEL_API_BASE,
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PipelineOne-DevOps-Platform',
    },
    params: teamId ? { teamId } : {},
    timeout: 15000,
  });

  const sanitizedName = sanitizeProjectName(projectName);

  try {
    // 1. Check if project already exists
    const existingRes = await client.get(`/v9/projects/${encodeURIComponent(sanitizedName)}`);
    const project = existingRes.data;
    logger.info(`Found existing Vercel project '${sanitizedName}' (ID: ${project.id})`);

    // If repoFullName is provided but not linked, attempt to link it
    if (repoFullName && (!project.link || project.link.type !== 'github' || project.link.repo !== repoFullName)) {
      try {
        await client.patch(`/v9/projects/${encodeURIComponent(project.id || sanitizedName)}`, {
          framework: framework || project.framework || null,
          gitRepository: {
            type: 'github',
            repo: repoFullName,
          },
          ...(buildCommand ? { buildCommand } : {}),
          ...(outputDirectory ? { outputDirectory } : {}),
        });
        logger.info(`Updated Vercel project '${sanitizedName}' Git integration to '${repoFullName}'`);
      } catch (patchErr) {
        logger.warn(`Could not update Git repository link on existing Vercel project: ${patchErr.message}`);
      }
    }

    return {
      id: project.id,
      name: project.name,
      accountId: project.accountId,
      link: project.link,
      alreadyExisted: true,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      // 2. Project does not exist, create new Vercel project
      logger.info(`Creating new Vercel project '${sanitizedName}' with Git repo '${repoFullName || 'none'}'`);
      const createPayload = {
        name: sanitizedName,
        framework: framework || null,
        ...(repoFullName
          ? {
              gitRepository: {
                type: 'github',
                repo: repoFullName,
              },
            }
          : {}),
        ...(buildCommand ? { buildCommand } : {}),
        ...(outputDirectory ? { outputDirectory } : {}),
        ...(rootDirectory ? { rootDirectory } : {}),
      };

      try {
        const createRes = await client.post('/v9/projects', createPayload);
        logger.info(`Successfully created Vercel project '${sanitizedName}' (ID: ${createRes.data.id})`);
        return {
          id: createRes.data.id,
          name: createRes.data.name,
          accountId: createRes.data.accountId,
          link: createRes.data.link,
          alreadyExisted: false,
        };
      } catch (createErr) {
        // If gitRepository parameter was rejected (e.g. GitHub app not installed on personal account), retry without gitRepository
        if (createPayload.gitRepository && createErr.response && createErr.response.status === 400) {
          logger.warn(`Vercel rejected gitRepository parameter (${createErr.response.data?.error?.message || createErr.message}). Retrying standalone project creation.`);
          delete createPayload.gitRepository;
          const retryRes = await client.post('/v9/projects', createPayload);
          return {
            id: retryRes.data.id,
            name: retryRes.data.name,
            accountId: retryRes.data.accountId,
            link: null,
            alreadyExisted: false,
          };
        }
        throw new Error(`Failed to create Vercel project '${sanitizedName}': ${createErr.response?.data?.error?.message || createErr.message}`);
      }
    }

    throw new Error(`Failed to query Vercel project '${sanitizedName}': ${err.response?.data?.error?.message || err.message}`);
  }
};

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
 * Deploys project to Vercel.
 * Prefers native Vercel Git integration (triggering native Vercel build engine from GitHub repo),
 * with robust direct static asset bundle deployment of real files as fallback.
 */
export const deployToVercel = async (options) => {
  const {
    token,
    teamId = null,
    projectName,
    target = 'production',
    gitSource = null, // { type: 'github', repo: 'owner/repo', ref: 'main', sha: '...', repoId: 123 }
    projectSettings = {},
    outputDirectory = null,
  } = options;

  if (!token) {
    throw new Error('Vercel deployment failed: No Vercel authentication token provided');
  }

  const sanitizedProjectName = sanitizeProjectName(projectName);
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

  // Attempt 1: Deploy using native Vercel Git integration if gitSource is present
  if (gitSource && gitSource.repo) {
    try {
      logger.info(`Deploying '${sanitizedProjectName}' via Vercel Git Integration for repo ${gitSource.repo}@${gitSource.ref || 'main'}`);
      const gitPayload = {
        name: sanitizedProjectName,
        target: target === 'preview' ? 'preview' : 'production',
        gitSource: {
          type: 'github',
          repo: gitSource.repo,
          ref: gitSource.ref || 'main',
          ...(gitSource.sha ? { sha: gitSource.sha } : {}),
          ...(gitSource.repoId ? { repoId: Number(gitSource.repoId) } : {}),
        },
        projectSettings: {
          framework: projectSettings.framework || null,
          buildCommand: projectSettings.buildCommand || null,
          outputDirectory: projectSettings.outputDirectory || null,
          rootDirectory: projectSettings.rootDirectory || null,
        },
      };

      const gitRes = await client.post('/v13/deployments', gitPayload);
      const data = gitRes.data;
      const deploymentId = data.id;
      const rawUrl = data.url;
      const deploymentUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

      logger.info(`Vercel Git deployment created: ID ${deploymentId}, URL: ${deploymentUrl}, State: ${data.readyState || data.status}`);

      return {
        deploymentId,
        url: deploymentUrl,
        inspectorUrl: data.inspectorUrl || null,
        readyState: data.readyState || data.status || 'INITIALIZING',
        createdAt: data.createdAt || Date.now(),
        gitSourceDeployed: true,
      };
    } catch (gitErr) {
      const errMsg = gitErr.response?.data?.error?.message || gitErr.message;
      logger.warn(`Vercel Git Integration deployment trigger encountered note: ${errMsg}. Falling back to real static file deployment.`);
      // Proceed to direct static file deployment below
    }
  }

  // Attempt 2: Deploy verified source / build output files directly via Vercel Edge API
  if (!outputDirectory || !fs.existsSync(outputDirectory)) {
    throw new Error(`Deployment directory '${outputDirectory}' does not exist on disk and Git integration trigger was unavailable`);
  }

  const files = collectStaticFiles(outputDirectory);
  if (files.length === 0) {
    throw new Error(`No deployment files found in directory '${outputDirectory}'. Genuine project files are required.`);
  }

  logger.info(`Initiating direct Vercel static asset deployment for '${sanitizedProjectName}' (${files.length} verified files)`);

  // Upload any files required by Vercel /v2/files endpoint
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

  // Create Deployment record via POST /v13/deployments
  const deploymentPayload = {
    name: sanitizedProjectName,
    target: target === 'preview' ? 'preview' : 'production',
    files: files.map((f) => ({
      file: f.file,
      sha: f.sha,
      size: f.size,
    })),
    projectSettings: {
      framework: projectSettings.framework || null,
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
    gitSourceDeployed: false,
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
  sanitizeProjectName,
  createOrLinkVercelProject,
  deployToVercel,
  getDeploymentStatus,
};
