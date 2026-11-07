import db from '../../config/db.js';
import logger from '../../utils/logger.js';
import { getExecutionEvents, recordEvent } from './pipelineStatusService.js';

/**
 * Pipeline Execution Service
 * Queries historical execution runs, inspects logs and timeline events, and handles cancellation.
 */

export const listExecutions = async (userId, projectId = null, limit = 50) => {
  let queryText = `
    SELECT e.*, p.name as project_name, p.slug as project_slug, p.project_type
    FROM pipeline_executions e
    JOIN projects p ON e.project_id = p.id
    WHERE e.user_id = $1
  `;
  const params = [userId];

  if (projectId) {
    queryText += ' AND e.project_id = $2';
    params.push(projectId);
  }

  queryText += ' ORDER BY e.created_at DESC LIMIT $' + (params.length + 1);
  params.push(limit);

  const res = await db.query(queryText, params);
  return res.rows;
};

export const getExecutionById = async (executionId, userId) => {
  const execRes = await db.query(
    `SELECT e.*, p.name as project_name, p.slug as project_slug, p.project_type, p.framework as detected_framework,
            c.github_branch, c.build_command, c.install_command, c.output_directory, c.docker_enabled,
            c.deployment_environment, c.vercel_project_id
     FROM pipeline_executions e
     JOIN projects p ON e.project_id = p.id
     LEFT JOIN pipeline_configurations c ON e.configuration_id = c.id
     WHERE e.id = $1 AND e.user_id = $2`,
    [executionId, userId]
  );

  if (execRes.rows.length === 0) {
    throw new Error('Pipeline execution run not found or unauthorized');
  }

  const execution = execRes.rows[0];
  const events = await getExecutionEvents(executionId);

  return {
    execution,
    events,
  };
};

export const cancelExecution = async (executionId, userId) => {
  const execRes = await db.query(
    'SELECT id, status FROM pipeline_executions WHERE id = $1 AND user_id = $2',
    [executionId, userId]
  );

  if (execRes.rows.length === 0) {
    throw new Error('Pipeline execution run not found or unauthorized');
  }

  const execution = execRes.rows[0];
  if (['success', 'failed', 'cancelled'].includes(execution.status)) {
    return {
      success: false,
      message: `Cannot cancel: execution is already in terminal state '${execution.status}'`,
    };
  }

  await db.query(
    `UPDATE pipeline_executions
     SET status = 'cancelled', current_stage = 'cancelled', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [executionId]
  );

  await recordEvent(executionId, {
    eventType: 'cancelled',
    stage: 'cancelled',
    message: 'Pipeline execution was cancelled by user',
    metadata: { previousStatus: execution.status },
  });

  logger.info(`Cancelled pipeline execution ${executionId}`);
  return { success: true, message: 'Execution cancelled successfully' };
};

export default {
  listExecutions,
  getExecutionById,
  cancelExecution,
};
