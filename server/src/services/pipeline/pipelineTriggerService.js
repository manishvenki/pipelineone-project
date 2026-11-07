import db from '../../config/db.js';
import logger from '../../utils/logger.js';
import { runPipeline } from './pipelineOrchestrator.js';
import { recordEvent } from './pipelineStatusService.js';
import { getConfiguration } from './pipelineConfigService.js';

/**
 * Pipeline Trigger Service
 * Validates configuration readiness and launches new pipeline execution instances.
 */

export const triggerPipelineRun = async ({ projectId, userId, branch = null, triggerSource = 'manual' }) => {
  // 1. Validate project ownership and details
  const projRes = await db.query(
    `SELECT p.*, pr.full_name as repo_full_name, pr.selected_branch, pr.last_commit_sha, pr.last_commit_message
     FROM projects p
     LEFT JOIN project_repositories pr ON pr.project_id = p.id
     WHERE p.id = $1 AND p.user_id = $2`,
    [projectId, userId]
  );

  if (projRes.rows.length === 0) {
    throw new Error('Project not found or unauthorized');
  }

  const project = projRes.rows[0];

  // 2. Fetch or initialize pipeline configuration
  const configData = await getConfiguration(projectId, userId);
  const config = configData.config;

  const targetBranch = branch || config.github_branch || project.selected_branch || 'main';
  const commitSha = project.last_commit_sha || 'HEAD';
  const commitMsg = project.last_commit_message || `Manual deployment on ${targetBranch}`;
  const repoName = project.repo_full_name || project.slug || project.name;

  // 3. Create execution record in pending state
  const insertSql = `
    INSERT INTO pipeline_executions (
      user_id, project_id, configuration_id, repository, branch,
      commit_sha, commit_message, trigger_source, status, current_stage
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'queued')
    RETURNING *;
  `;

  const execRes = await db.query(insertSql, [
    userId,
    projectId,
    config.id || null,
    repoName,
    targetBranch,
    commitSha,
    commitMsg,
    triggerSource,
  ]);

  const execution = execRes.rows[0];

  await recordEvent(execution.id, {
    eventType: 'created',
    stage: 'queued',
    message: `Pipeline execution queued by user (${triggerSource})`,
    metadata: { branch: targetBranch, commitSha },
  });

  // 4. Asynchronously dispatch the orchestrator
  setImmediate(() => {
    runPipeline(execution.id).catch((err) => {
      logger.error(`Orchestrator error on execution ${execution.id}: ${err.message}`);
    });
  });

  return execution;
};

export default {
  triggerPipelineRun,
};
