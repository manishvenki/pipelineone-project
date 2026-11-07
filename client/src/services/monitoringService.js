import api from './api';

// ==========================================
// Dashboard Overview & Active Pipelines
// ==========================================

export const getDashboardOverview = async (dateRange = '30d') => {
  const res = await api.get('/api/dashboard/overview', { params: { dateRange } });
  return res.data;
};

export const getActivePipelines = async () => {
  const res = await api.get('/api/dashboard/active-pipelines');
  return res.data;
};

export const getRecentExecutions = async (limit = 10) => {
  const res = await api.get('/api/dashboard/recent-executions', { params: { limit } });
  return res.data;
};

// ==========================================
// Pipeline Monitoring Details, Stages & Logs
// ==========================================

export const getPipelineDetails = async (executionId) => {
  const res = await api.get(`/api/monitoring/pipelines/${executionId}`);
  return res.data;
};

export const getPipelineStages = async (executionId) => {
  const res = await api.get(`/api/monitoring/pipelines/${executionId}/stages`);
  return res.data;
};

export const getPipelineLogs = async (executionId) => {
  const res = await api.get(`/api/monitoring/pipelines/${executionId}/logs`);
  return res.data;
};

/**
 * Creates an EventSource instance for real-time monitoring SSE stream.
 * Automatically handles auth token, connection status, event parsing, and cleanup.
 */
export const createPipelineMonitoringStream = (executionId, onMessage, onError, onConnectionChange) => {
  const token = localStorage.getItem('pipeline_token') || localStorage.getItem('token');
  const url = `/api/monitoring/pipelines/${executionId}/stream${token ? `?token=${token}` : ''}`;
  const eventSource = new EventSource(url);

  if (onConnectionChange) onConnectionChange('connecting');

  eventSource.onopen = () => {
    if (onConnectionChange) onConnectionChange('connected');
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
      if (data.eventType === 'done' || data.eventType === 'pipeline_success' || data.eventType === 'pipeline_failed') {
        if (onConnectionChange) onConnectionChange('closed');
      }
    } catch {
      // heartbeats or plain text
    }
  };

  eventSource.onerror = (err) => {
    if (onConnectionChange) onConnectionChange('reconnecting');
    if (onError) onError(err);
  };

  return eventSource;
};

export default {
  getDashboardOverview,
  getActivePipelines,
  getRecentExecutions,
  getPipelineDetails,
  getPipelineStages,
  getPipelineLogs,
  createPipelineMonitoringStream,
};
