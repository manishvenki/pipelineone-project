import api from './api';

// ==========================================
// 1. Docker Hub APIs
// ==========================================
export const connectDockerHub = async ({ username, personalAccessToken }) => {
  const res = await api.post('/api/integrations/dockerhub/connect', { username, personalAccessToken });
  return res.data;
};

export const getDockerHubStatus = async () => {
  const res = await api.get('/api/integrations/dockerhub/status');
  return res.data;
};

export const verifyDockerHub = async () => {
  const res = await api.post('/api/integrations/dockerhub/verify');
  return res.data;
};

export const disconnectDockerHub = async () => {
  const res = await api.delete('/api/integrations/dockerhub/disconnect');
  return res.data;
};

export const getDockerHubRepositories = async (page = 1, pageSize = 25) => {
  const res = await api.get('/api/dockerhub/repositories', { params: { page, pageSize } });
  return res.data;
};

export const getDockerHubTags = async (namespace, repository) => {
  const res = await api.get(`/api/dockerhub/repositories/${namespace}/${repository}/tags`);
  return res.data;
};

// ==========================================
// 2. Jenkins APIs
// ==========================================
export const connectJenkins = async ({ serverUrl, username, apiToken, displayName }) => {
  const res = await api.post('/api/integrations/jenkins/connect', {
    serverUrl,
    username,
    apiToken,
    displayName,
  });
  return res.data;
};

export const getJenkinsStatus = async () => {
  const res = await api.get('/api/integrations/jenkins/status');
  return res.data;
};

export const verifyJenkins = async () => {
  const res = await api.post('/api/integrations/jenkins/verify');
  return res.data;
};

export const disconnectJenkins = async () => {
  const res = await api.delete('/api/integrations/jenkins/disconnect');
  return res.data;
};

export const getJenkinsJobs = async () => {
  const res = await api.get('/api/jenkins/jobs');
  return res.data;
};

export const getJenkinsJobDetails = async (jobName) => {
  const res = await api.get(`/api/jenkins/jobs/${encodeURIComponent(jobName)}`);
  return res.data;
};

// ==========================================
// 3. Vercel APIs
// ==========================================
export const getVercelOAuthUrl = async () => {
  const res = await api.get('/api/integrations/vercel/connect');
  return res.data.authUrl;
};

export const connectVercel = async (params) => {
  const token = typeof params === 'string' ? params : params?.token;
  const res = await api.post('/api/integrations/vercel/token-connect', { token });
  return res.data;
};

export const connectVercelToken = connectVercel;

export const getVercelStatus = async () => {
  const res = await api.get('/api/integrations/vercel/status');
  return res.data;
};

export const verifyVercel = async () => {
  const res = await api.post('/api/integrations/vercel/verify');
  return res.data;
};

export const disconnectVercel = async () => {
  const res = await api.delete('/api/integrations/vercel/disconnect');
  return res.data;
};

export const getVercelProjects = async (teamId = null) => {
  const res = await api.get('/api/vercel/projects', { params: teamId ? { teamId } : {} });
  return res.data;
};

export const configureVercelProject = async (config) => {
  const res = await api.post('/api/vercel/configure', config);
  return res.data;
};

// ==========================================
// 4. Docker Containerization APIs
// ==========================================
export const triggerDockerBuild = async (buildPayload) => {
  const res = await api.post('/api/docker/builds', buildPayload);
  return res.data;
};

export const listDockerBuilds = async (projectId = null) => {
  const res = await api.get('/api/docker/builds', { params: projectId ? { projectId } : {} });
  return res.data;
};

export const getDockerBuild = async (buildId) => {
  const res = await api.get(`/api/docker/builds/${buildId}`);
  return res.data;
};

export const getDockerBuildLogs = async (buildId) => {
  const res = await api.get(`/api/docker/builds/${buildId}/logs`);
  return res.data;
};

export const cancelDockerBuild = async (buildId) => {
  const res = await api.post(`/api/docker/builds/${buildId}/cancel`);
  return res.data;
};

export const checkDockerEngine = async () => {
  const res = await api.get('/api/docker/engine');
  return res.data;
};

// Unified Status
export const getAllIntegrationsStatus = async () => {
  const res = await api.get('/api/integrations/status');
  return res.data;
};

export default {
  connectDockerHub,
  getDockerHubStatus,
  verifyDockerHub,
  disconnectDockerHub,
  getDockerHubRepositories,
  getDockerHubTags,
  connectJenkins,
  getJenkinsStatus,
  verifyJenkins,
  disconnectJenkins,
  getJenkinsJobs,
  getJenkinsJobDetails,
  getVercelOAuthUrl,
  connectVercel,
  connectVercelToken,
  getVercelStatus,
  verifyVercel,
  disconnectVercel,
  getVercelProjects,
  configureVercelProject,
  triggerDockerBuild,
  listDockerBuilds,
  getDockerBuild,
  getDockerBuildLogs,
  cancelDockerBuild,
  checkDockerEngine,
  getAllIntegrationsStatus,
};
