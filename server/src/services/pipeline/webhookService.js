import crypto from 'crypto';
import db from '../../config/db.js';
import logger from '../../utils/logger.js';
import { runPipeline } from './pipelineOrchestrator.js';

/**
 * Validates GitHub HMAC-SHA256 signature
 */
export const verifyWebhookSignature = (rawBody, signatureHeader, secret) => {
  if (!signatureHeader || !secret) {
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const signatureBuffer = Buffer.from(parts[1], 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

/**
 * Handles incoming GitHub webhook payloads
 */
export const handleGitHubWebhook = async ({ rawBody, signatureHeader, eventType, deliveryId, payload }) => {
  // 1. Idempotency Check: prevent duplicate event execution
  if (deliveryId) {
    const existing = await db.query(
      'SELECT id, processing_status, triggered_execution_id FROM github_webhook_events WHERE delivery_id = $1',
      [deliveryId]
    );

    if (existing.rows.length > 0) {
      logger.warn(`Duplicate webhook delivery rejected: ${deliveryId}`);
      return {
        success: true,
        duplicate: true,
        status: existing.rows[0].processing_status,
        executionId: existing.rows[0].triggered_execution_id,
        message: 'Delivery already processed',
      };
    }
  }

  // 2. Identify repository from payload
  const repoFullName = payload.repository?.full_name;
  if (!repoFullName) {
    throw new Error('Invalid webhook payload: Missing repository information');
  }

  // 3. Find matching project and configuration
  const projRes = await db.query(
    `SELECT p.id as project_id, p.user_id, p.name as project_name, p.slug,
            c.id as config_id, c.github_branch, c.auto_deploy_enabled, c.webhook_secret
     FROM projects p
     LEFT JOIN project_repositories pr ON pr.project_id = p.id
     LEFT JOIN pipeline_configurations c ON c.project_id = p.id
     WHERE LOWER(pr.full_name) = LOWER($1) OR LOWER(p.name) = LOWER($2)
     ORDER BY p.created_at DESC LIMIT 1`,
    [repoFullName, repoFullName.split('/')[1] || repoFullName]
  );

  if (projRes.rows.length === 0) {
    logger.warn(`Webhook received for untracked repository: ${repoFullName}`);
    return {
      success: false,
      ignored: true,
      message: `Repository '${repoFullName}' is not linked to any Pipeline One project`,
    };
  }

  const project = projRes.rows[0];
  const webhookSecret = project.webhook_secret;

  // 4. Verify HMAC signature if secret is configured
  if (webhookSecret) {
    const isValid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
    if (!isValid) {
      logger.error(`Webhook signature verification failed for repo: ${repoFullName}`);
      throw new Error('Invalid webhook HMAC-SHA256 signature');
    }
  }

  // 5. Handle 'ping' event
  if (eventType === 'ping') {
    if (deliveryId) {
      await db.query(
        `INSERT INTO github_webhook_events (project_id, delivery_id, event_type, processing_status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (delivery_id) DO NOTHING`,
        [project.project_id, deliveryId, 'ping', 'processed']
      );
    }
    return {
      success: true,
      event: 'ping',
      message: `Ping received for project '${project.project_name}'. Webhook active.`,
    };
  }

  // 6. Handle 'push' event
  if (eventType === 'push') {
    const ref = payload.ref || '';
    const branch = ref.replace('refs/heads/', '');
    const commitSha = payload.after || payload.head_commit?.id || 'HEAD';
    const commitMessage = payload.head_commit?.message || 'Push event trigger';
    const sender = payload.sender?.login || 'github';

    const targetBranch = project.github_branch || 'main';

    // Verify branch matches configuration
    if (branch !== targetBranch) {
      logger.info(`Push event on branch '${branch}' ignored (configured branch is '${targetBranch}')`);

      if (deliveryId) {
        await db.query(
          `INSERT INTO github_webhook_events (project_id, delivery_id, event_type, commit_sha, branch, sender, processing_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (delivery_id) DO NOTHING`,
          [project.project_id, deliveryId, 'push', commitSha, branch, sender, 'ignored']
        );
      }

      return {
        success: true,
        ignored: true,
        message: `Push on branch '${branch}' does not match target branch '${targetBranch}'`,
      };
    }

    // Check if auto deploy is enabled
    if (project.auto_deploy_enabled === false) {
      logger.info(`Push event received but auto-deploy is disabled for project '${project.project_name}'`);
      return {
        success: true,
        ignored: true,
        message: 'Auto-deploy disabled in project configuration',
      };
    }

    // Create execution record in pending state
    const execRes = await db.query(
      `INSERT INTO pipeline_executions (
        user_id, project_id, configuration_id, repository, branch,
        commit_sha, commit_message, trigger_source, status, current_stage
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'queued')
      RETURNING id`,
      [
        project.user_id,
        project.project_id,
        project.config_id || null,
        repoFullName,
        branch,
        commitSha,
        commitMessage,
        'webhook',
      ]
    );

    const executionId = execRes.rows[0].id;

    // Record delivery idempotency event
    if (deliveryId) {
      await db.query(
        `INSERT INTO github_webhook_events (
          project_id, delivery_id, event_type, commit_sha, branch,
          sender, processing_status, triggered_execution_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'processed', $7)
        ON CONFLICT (delivery_id) DO UPDATE SET
          triggered_execution_id = EXCLUDED.triggered_execution_id,
          processing_status = 'processed'`,
        [project.project_id, deliveryId, 'push', commitSha, branch, sender, executionId]
      );
    }

    // Dispatch pipeline execution asynchronously in background
    setImmediate(() => {
      runPipeline(executionId).catch((err) => {
        logger.error(`Webhook-triggered pipeline ${executionId} encountered error: ${err.message}`);
      });
    });

    return {
      success: true,
      triggered: true,
      executionId,
      branch,
      commitSha,
      message: `Triggered CI/CD pipeline execution for commit ${commitSha.slice(0, 7)}`,
    };
  }

  // Other GitHub events
  return {
    success: true,
    ignored: true,
    message: `Event type '${eventType}' ignored`,
  };
};

export default {
  verifyWebhookSignature,
  handleGitHubWebhook,
};

