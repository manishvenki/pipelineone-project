import db from '../../config/db.js';
import logger from '../../utils/logger.js';
import { runPipeline } from './pipelineOrchestrator.js';
import { recordEvent } from './pipelineStatusService.js';

/**
 * Pipeline Retry Service
 * Safely creates a fresh, traceable execution attempt from a failed or cancelled pipeline run.
 */

export const retryExecution = async (previousExecutionId, userId) => {
  // 1. Fetch previous execution
  const prevRes = await db.query(
    'SELECT * FROM pipeline_executions WHERE id = $1 AND user_id = $2',
    [previousExecutionId, userId]
  );

  if (prevRes.rows.length === 0) {
    throw new Error('Previous execution run not found or unauthorized');
  }

  const prev = prevRes.rows[0];

  // 2. Insert new execution record with trigger_source = 'retry'
  const insertSql = `
    INSERT INTO pipeline_executions (
      user_id, project_id, configuration_id, repository, branch,
      commit_sha, commit_message, trigger_source, status, current_stage
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'retry', 'pending', 'queued')
    RETURNING *;
  `;

  const newRes = await db.query(insertSql, [
    userId,
    prev.project_id,
    prev.configuration_id,
    prev.repository,
    prev.branch,
    prev.commit_sha,
    `Retry of execution #${previousExecutionId.slice(0, 8)}`,
  ]);

  const newExecution = newRes.rows[0];

  await recordEvent(newExecution.id, {
    eventType: 'retry_initiated',
    stage: 'queued',
    message: `Retry initiated from previous failed execution #${previousExecutionId.slice(0, 8)}`,
    metadata: { previousExecutionId },
  });

  // 3. Dispatch new execution asynchronously
  setImmediate(() => {
    runPipeline(newExecution.id).catch((err) => {
      logger.error(`Retry execution ${newExecution.id} error: ${err.message}`);
    });
  });

  return newExecution;
};

export default {
  retryExecution,
};
