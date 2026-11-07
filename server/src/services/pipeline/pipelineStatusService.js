import { EventEmitter } from 'events';
import db from '../../config/db.js';
import logger from '../../utils/logger.js';

// Global EventEmitter for real-time SSE execution events
const pipelineEmitter = new EventEmitter();
pipelineEmitter.setMaxListeners(200);

/**
 * Emits and persists a pipeline execution event
 */
export const recordEvent = async (executionId, { eventType, stage, message, metadata = {} }) => {
  try {
    const insertSql = `
      INSERT INTO pipeline_events (execution_id, event_type, stage, message, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const res = await db.query(insertSql, [
      executionId,
      eventType,
      stage || null,
      message,
      JSON.stringify(metadata),
    ]);

    const eventRecord = res.rows[0];

    // Emit live event to subscribers
    pipelineEmitter.emit(`event:${executionId}`, eventRecord);

    return eventRecord;
  } catch (err) {
    logger.error(`Failed to record pipeline event for execution ${executionId}:`, { error: err.message });
    return null;
  }
};

/**
 * Retrieves historical events for a pipeline execution
 */
export const getExecutionEvents = async (executionId) => {
  const res = await db.query(
    'SELECT * FROM pipeline_events WHERE execution_id = $1 ORDER BY created_at ASC',
    [executionId]
  );
  return res.rows;
};

/**
 * Handles Server-Sent Events (SSE) streaming for a pipeline execution
 */
export const handleExecutionStream = async (req, res, executionId) => {
  // 1. Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // 2. Send historical events immediately
  const historicalEvents = await getExecutionEvents(executionId);
  res.write(`event: initial_events\ndata: ${JSON.stringify({ events: historicalEvents })}\n\n`);

  // 3. Listener for real-time events
  const onEvent = (eventData) => {
    res.write(`event: event\ndata: ${JSON.stringify(eventData)}\n\n`);

    // If execution reached a terminal state, end stream cleanly
    if (
      eventData.event_type === 'state_change' &&
      ['success', 'failed', 'cancelled'].includes(eventData.stage)
    ) {
      cleanup();
      res.end();
    }
  };

  pipelineEmitter.on(`event:${executionId}`, onEvent);

  const cleanup = () => {
    pipelineEmitter.removeListener(`event:${executionId}`, onEvent);
  };

  req.on('close', cleanup);
};

export default {
  pipelineEmitter,
  recordEvent,
  getExecutionEvents,
  handleExecutionStream,
};
