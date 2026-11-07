import api from './api';

export const getAnalyticsOverview = async (dateRange = '30d') => {
  const res = await api.get('/api/analytics/overview', { params: { dateRange } });
  return res.data;
};

export const getDeploymentTrends = async (dateRange = '30d') => {
  const res = await api.get('/api/analytics/deployments', { params: { dateRange } });
  return res.data;
};

export const getBuildPerformance = async (dateRange = '30d') => {
  const res = await api.get('/api/analytics/build-performance', { params: { dateRange } });
  return res.data;
};

export const getProjectActivity = async (dateRange = '30d') => {
  const res = await api.get('/api/analytics/project-activity', { params: { dateRange } });
  return res.data;
};

export default {
  getAnalyticsOverview,
  getDeploymentTrends,
  getBuildPerformance,
  getProjectActivity,
};
