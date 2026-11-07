import api from './api';

// ==========================================
// Pipeline Configuration APIs
// ==========================================

export const getPipelineConfig = async (projectId) => {
  const res = await api.get(`/api/pipelines/config/${projectId}`);
  return res.data;
};

export const savePipelineConfig = async (projectId, configData) => {
  const res = await api.post(`/api/pipelines/config/${projectId}`, configData);
  return res.data;
};

export const resetPipelineConfig = async (projectId) => {
  const res = await api.delete(`/api/pipelines/config/${projectId}`);
  return res.data;
};

// ==========================================
// Pipeline Execution APIs
// ==========================================

export const triggerPipelineRun = async ({
  projectId,
  branch = 'main',
  environment = 'production',
  commitSha = null,
  commitMessage = null,
  commitAuthor = null,
}) => {
  const res = await api.post('/api/pipelines/trigger', {
    projectId,
    branch,
    environment,
    commitSha,
    commitMessage,
    commitAuthor,
  });
  return res.data;
};

export const listPipelineExecutions = async (params = {}) => {
  const res = await api.get('/api/pipelines/executions', { params });
  return res.data;
};

export const getPipelineExecution = async (executionId) => {
  const res = await api.get(`/api/pipelines/executions/${executionId}`);
  return res.data;
};

export const retryPipelineExecution = async (executionId) => {
  const res = await api.post(`/api/pipelines/executions/${executionId}/retry`);
  return res.data;
};

export const cancelPipelineExecution = async (executionId) => {
  const res = await api.post(`/api/pipelines/executions/${executionId}/cancel`);
  return res.data;
};

export const cancelPipeline = cancelPipelineExecution;
export const retryPipeline = retryPipelineExecution;

/**
 * Creates an EventSource instance for real-time SSE execution logs and status.
 * Accepts a callback for received events and automatically handles cleanup.
 */
export const createExecutionEventSource = (executionId, onEvent, onError) => {
  // Construct URL with API base if needed, or relative path
  const token = localStorage.getItem('token');
  const url = `/api/pipelines/executions/${executionId}/events${token ? `?token=${token}` : ''}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onEvent) onEvent(data);
    } catch {
      // heartbeats or plain text
    }
  };

  eventSource.addEventListener('stage_change', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onEvent) onEvent({ eventType: 'stage_change', ...data });
    } catch {
      // parse fail
    }
  });

  eventSource.addEventListener('log', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onEvent) onEvent({ eventType: 'log', ...data });
    } catch {
      // parse fail
    }
  });

  eventSource.addEventListener('done', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onEvent) onEvent({ eventType: 'done', ...data });
    } catch {
      // parse fail
    }
    eventSource.close();
  });

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return eventSource;
};

export default {
  getPipelineConfig,
  savePipelineConfig,
  resetPipelineConfig,
  triggerPipelineRun,
  listPipelineExecutions,
  getPipelineExecution,
  retryPipelineExecution,
  cancelPipelineExecution,
  createExecutionEventSource,
};

