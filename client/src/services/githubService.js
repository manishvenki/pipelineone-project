import api from './api';

export const getGitHubStatus = async () => {
  const res = await api.get('/api/integrations/github/status');
  return res.data;
};

export const getOAuthConnectUrl = async () => {
  const res = await api.get('/api/integrations/github/connect');
  return res.data.authUrl;
};

export const connectWithPat = async (personalAccessToken) => {
  const res = await api.post('/api/integrations/github/connect-pat', { personalAccessToken });
  return res.data;
};

export const disconnectGitHub = async () => {
  const res = await api.delete('/api/integrations/github/disconnect');
  return res.data;
};

export const getRepositories = async (params = {}) => {
  const res = await api.get('/api/github/repositories', { params });
  return res.data;
};

export const getRepositoryDetails = async (owner, repo) => {
  const res = await api.get(`/api/github/repositories/${owner}/${repo}`);
  return res.data;
};

export const getRepositoryBranches = async (owner, repo) => {
  const res = await api.get(`/api/github/repositories/${owner}/${repo}/branches`);
  return res.data;
};

export default {
  getGitHubStatus,
  getOAuthConnectUrl,
  connectWithPat,
  disconnectGitHub,
  getRepositories,
  getRepositoryDetails,
  getRepositoryBranches,
};

