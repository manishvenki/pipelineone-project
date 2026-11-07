import monitoringService from '../services/monitoringService.js';
import logStreamingService from '../services/logStreamingService.js';
import { subscribeExecutionEvents } from '../services/pipeline/pipelineStatusService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/dashboard/overview
 */
export const getDashboardOverview = async (req, res) => {
  try {
    const dateRange = req.query.dateRange || '30d';
    const overview = await monitoringService.getDashboardOverview(req.user.id, dateRange);
    return res.json({ success: true, ...overview });
  } catch (err) {
    logger.error('Failed to get dashboard overview', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve dashboard overview' });
  }
};

/**
 * GET /api/dashboard/active-pipelines
 */
export const getActivePipelines = async (req, res) => {
  try {
    const pipelines = await monitoringService.getActivePipelines(req.user.id);
    return res.json({ success: true, count: pipelines.length, pipelines });
  } catch (err) {
    logger.error('Failed to get active pipelines', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve active pipelines' });
  }
};

/**
 * GET /api/dashboard/recent-executions
 */
export const getRecentExecutions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const executions = await monitoringService.getRecentExecutions(req.user.id, limit);
    return res.json({ success: true, count: executions.length, executions });
  } catch (err) {
    logger.error('Failed to get recent executions', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve recent executions' });
  }
};

/**
 * GET /api/monitoring/pipelines/:id
 */
export const getPipelineDetails = async (req, res) => {
  try {
    const details = await monitoringService.getPipelineExecutionDetails(req.user.id, req.params.id);
    return res.json({ success: true, ...details });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('denied')) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('Failed to get pipeline details', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve pipeline details' });
  }
};

/**
 * GET /api/monitoring/pipelines/:id/stages
 */
export const getPipelineStages = async (req, res) => {
  try {
    const stages = await monitoringService.getPipelineStages(req.user.id, req.params.id);
    return res.json({ success: true, executionId: req.params.id, stages });
  } catch (err) {
    logger.error('Failed to get pipeline stages', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve pipeline stages' });
  }
};

/**
 * GET /api/monitoring/pipelines/:id/logs
 */
export const getPipelineLogs = async (req, res) => {
  try {
    const logData = await logStreamingService.getExecutionLogs(req.user.id, req.params.id);
    return res.json({ success: true, ...logData });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('denied')) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('Failed to get pipeline logs', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve pipeline logs' });
  }
};

/**
 * GET /api/monitoring/pipelines/:id/stream
 * Server-Sent Events stream for live execution monitoring
 */
export const streamPipelineEvents = async (req, res) => {
  const executionId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify ownership and fetch initial execution state
    const details = await monitoringService.getPipelineExecutionDetails(userId, executionId);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ eventType: 'initial_state', execution: details.execution, stages: details.stages })}\n\n`);

    // If already in terminal state, send done event and close stream
    if (['success', 'failed', 'cancelled'].includes(details.execution.status)) {
      res.write(`data: ${JSON.stringify({ eventType: 'done', status: details.execution.status, live_url: details.execution.live_url })}\n\n`);
      return res.end();
    }

    // 2. Subscribe to real-time events
    const unsubscribe = subscribeExecutionEvents(executionId, (event) => {
      // Redact any secrets before sending over SSE stream
      const cleanEvent = { ...event };
      if (typeof cleanEvent.message === 'string') {
        cleanEvent.message = logStreamingService.sanitizeLogText(cleanEvent.message);
      }
      res.write(`data: ${JSON.stringify(cleanEvent)}\n\n`);

      if (['pipeline_success', 'pipeline_failed', 'cancelled'].includes(event.eventType) || event.eventType === 'done') {
        res.end();
      }
    });

    // Keepalive heartbeat every 15 seconds
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (err) {
    logger.error('Failed to stream pipeline events', { error: err.message });
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to initialize event stream' });
    }
  }
};

export default {
  getDashboardOverview,
  getActivePipelines,
  getRecentExecutions,
  getPipelineDetails,
  getPipelineStages,
  getPipelineLogs,
  streamPipelineEvents,
};

