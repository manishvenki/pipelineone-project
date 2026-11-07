import db from '../config/db.js';
import logger from '../utils/logger.js';

// Secret pattern matching for server-side redaction
const SECRET_PATTERNS = [
  // GitHub PATs and OAuth tokens
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{82}/g,

  // Vercel access tokens
  /vercel_[a-zA-Z0-9]{24,}/gi,

  // JWT patterns
  /eyJ[a-zA-Z0-9-_]{10,}\.eyJ[a-zA-Z0-9-_]{10,}\.[a-zA-Z0-9-_]{10,}/g,

  // Bearer tokens
  /Bearer\s+([a-zA-Z0-9._\-]{16,})/gi,

  // Passwords in command line or headers
  /--password\s+([^\s]+)/gi,
  /password[:=]\s*([^\s,]+)/gi,
  /--api-token\s+([^\s]+)/gi,
  /apiToken[:=]\s*([^\s,]+)/gi,
  /secret[:=]\s*([^\s,]+)/gi,

  // Private key blocks
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
];

/**
 * Server-side Secret Redaction
 * Replaces any credentials, tokens, or sensitive values with [REDACTED_SECRET].
 */
export const sanitizeLogText = (text) => {
  if (typeof text !== 'string') return '';

  let sanitized = text;

  // Mask known secret patterns
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED_SECRET]';
      }
      if (match.toLowerCase().startsWith('--password ')) {
        return '--password [REDACTED_SECRET]';
      }
      if (match.toLowerCase().startsWith('--api-token ')) {
        return '--api-token [REDACTED_SECRET]';
      }
      return '[REDACTED_SECRET]';
    });
  }

  return sanitized;
};

/**
 * Retrieve execution logs with server-side redaction
 */
export const getExecutionLogs = async (userId, executionId) => {
  // 1. Verify user ownership
  const execRes = await db.query(
    `SELECT e.id, e.user_id, e.status, e.current_stage, e.started_at, e.completed_at
     FROM pipeline_executions e
     WHERE e.id = $1 AND e.user_id = $2`,
    [executionId, userId]
  );

  if (execRes.rows.length === 0) {
    throw new Error('Pipeline execution not found or access denied');
  }

  const execution = execRes.rows[0];

  // 2. Fetch logs from pipeline_events
  const eventsRes = await db.query(
    `SELECT id, stage, message, event_type, metadata, created_at
     FROM pipeline_events
     WHERE execution_id = $1
     ORDER BY created_at ASC`,
    [executionId]
  );

  const logs = eventsRes.rows.map((row) => {
    const rawMessage = row.message || '';
    const cleanMessage = sanitizeLogText(rawMessage);

    // Determine log level
    let level = 'info';
    const lower = cleanMessage.toLowerCase();
    if (lower.includes('error') || lower.includes('failed') || lower.includes('fatal')) {
      level = 'error';
    } else if (lower.includes('warn') || lower.includes('warning') || lower.includes('deprecated')) {
      level = 'warn';
    }

    return {
      id: row.id,
      timestamp: row.created_at,
      stage: row.stage || execution.current_stage || 'pipeline',
      eventType: row.event_type,
      level,
      message: cleanMessage,
    };
  });

  return {
    executionId: execution.id,
    status: execution.status,
    currentStage: execution.current_stage,
    totalLines: logs.length,
    logs,
  };
};

export default {
  sanitizeLogText,
  getExecutionLogs,
};
