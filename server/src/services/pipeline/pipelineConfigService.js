import crypto from 'crypto';
import db from '../../config/db.js';
import logger from '../../utils/logger.js';

/**
 * Pipeline Configuration Service
 * Manages project-level CI/CD pipeline settings, build parameters, and deployment targets.
 */

export const generateWebhookSecret = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Get pipeline configuration for a project, or generate default settings based on static detection
 */
export const getConfiguration = async (projectId, userId) => {
  // 1. Verify project exists and belongs to user
  const projRes = await db.query(
    'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );

  if (projRes.rows.length === 0) {
    throw new Error('Project not found or unauthorized');
  }

  const project = projRes.rows[0];

  // 2. Query existing configuration
  const configRes = await db.query(
    'SELECT * FROM pipeline_configurations WHERE project_id = $1',
    [projectId]
  );

  if (configRes.rows.length > 0) {
    return {
      configured: true,
      config: configRes.rows[0],
      project,
    };
  }

  // 3. Generate sensible defaults based on detected project type
  const isReactVite = project.project_type === 'react_vite' || project.framework === 'vite';
  const defaults = {
    project_id: projectId,
    user_id: userId,
    github_branch: 'main',
    install_command: isReactVite ? 'npm ci' : '',
    build_command: project.build_command || (isReactVite ? 'npm run build' : ''),
    output_directory: project.output_directory || (isReactVite ? 'dist' : '.'),
    node_version: isReactVite ? '20' : 'none',
    docker_enabled: false,
    docker_publish_enabled: false,
    docker_repository: '',
    docker_tag: 'latest',
    vercel_project_id: '',
    deployment_environment: 'production',
    auto_deploy_enabled: true,
    webhook_secret: generateWebhookSecret(),
  };

  return {
    configured: false,
    config: defaults,
    project,
  };
};

/**
 * Upsert pipeline configuration
 */
export const saveConfiguration = async (projectId, userId, configData) => {
  // 1. Verify ownership
  const projRes = await db.query(
    'SELECT id, name FROM projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );

  if (projRes.rows.length === 0) {
    throw new Error('Project not found or unauthorized');
  }

  const {
    github_branch = 'main',
    build_command = '',
    install_command = '',
    output_directory = '.',
    node_version = '20',
    docker_enabled = false,
    docker_publish_enabled = false,
    docker_repository = '',
    docker_tag = 'latest',
    vercel_project_id = '',
    deployment_environment = 'production',
    auto_deploy_enabled = true,
  } = configData;

  // Retrieve existing secret or generate new one
  const existingRes = await db.query(
    'SELECT webhook_secret FROM pipeline_configurations WHERE project_id = $1',
    [projectId]
  );

  const webhook_secret = existingRes.rows[0]?.webhook_secret || generateWebhookSecret();

  const upsertSql = `
    INSERT INTO pipeline_configurations (
      user_id, project_id, github_branch, build_command, install_command,
      output_directory, node_version, docker_enabled, docker_publish_enabled,
      docker_repository, docker_tag, vercel_project_id, deployment_environment,
      auto_deploy_enabled, webhook_secret, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
    ON CONFLICT (project_id) DO UPDATE SET
      github_branch = EXCLUDED.github_branch,
      build_command = EXCLUDED.build_command,
      install_command = EXCLUDED.install_command,
      output_directory = EXCLUDED.output_directory,
      node_version = EXCLUDED.node_version,
      docker_enabled = EXCLUDED.docker_enabled,
      docker_publish_enabled = EXCLUDED.docker_publish_enabled,
      docker_repository = EXCLUDED.docker_repository,
      docker_tag = EXCLUDED.docker_tag,
      vercel_project_id = EXCLUDED.vercel_project_id,
      deployment_environment = EXCLUDED.deployment_environment,
      auto_deploy_enabled = EXCLUDED.auto_deploy_enabled,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const result = await db.query(upsertSql, [
    userId,
    projectId,
    github_branch.trim(),
    build_command.trim(),
    install_command.trim(),
    output_directory.trim() || '.',
    node_version.trim() || '20',
    Boolean(docker_enabled),
    Boolean(docker_publish_enabled),
    docker_repository.trim(),
    docker_tag.trim() || 'latest',
    vercel_project_id.trim(),
    deployment_environment === 'preview' ? 'preview' : 'production',
    Boolean(auto_deploy_enabled),
    webhook_secret,
  ]);

  logger.info(`Pipeline configuration saved for project ${projectId}`);
  return result.rows[0];
};

/**
 * Delete pipeline configuration
 */
export const deleteConfiguration = async (projectId, userId) => {
  const result = await db.query(
    'DELETE FROM pipeline_configurations WHERE project_id = $1 AND user_id = $2 RETURNING id',
    [projectId, userId]
  );
  return result.rows.length > 0;
};

export default {
  getConfiguration,
  saveConfiguration,
  deleteConfiguration,
  generateWebhookSecret,
};
