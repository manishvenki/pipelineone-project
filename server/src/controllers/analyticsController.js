import analyticsService from '../services/analyticsService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/analytics/overview
 */
export const getAnalyticsOverview = async (req, res) => {
  try {
    const dateRange = req.query.dateRange || '30d';
    const analytics = await analyticsService.getDeploymentAnalytics(req.user.id, dateRange);
    return res.json({ success: true, ...analytics });
  } catch (err) {
    logger.error('Failed to get analytics overview', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
};

/**
 * GET /api/analytics/deployments
 */
export const getDeploymentTrends = async (req, res) => {
  try {
    const dateRange = req.query.dateRange || '30d';
    const analytics = await analyticsService.getDeploymentAnalytics(req.user.id, dateRange);
    return res.json({
      success: true,
      dateRange: analytics.dateRange,
      trends: analytics.dailyTrends,
    });
  } catch (err) {
    logger.error('Failed to get deployment trends', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve deployment trends' });
  }
};

/**
 * GET /api/analytics/build-performance
 */
export const getBuildPerformance = async (req, res) => {
  try {
    const dateRange = req.query.dateRange || '30d';
    const analytics = await analyticsService.getDeploymentAnalytics(req.user.id, dateRange);
    return res.json({
      success: true,
      performance: analytics.summary.performance,
      successRate: analytics.summary.successRate,
    });
  } catch (err) {
    logger.error('Failed to get build performance', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve build performance' });
  }
};

/**
 * GET /api/analytics/project-activity
 */
export const getProjectActivity = async (req, res) => {
  try {
    const dateRange = req.query.dateRange || '30d';
    const analytics = await analyticsService.getDeploymentAnalytics(req.user.id, dateRange);
    return res.json({
      success: true,
      projects: analytics.projectActivity,
    });
  } catch (err) {
    logger.error('Failed to get project activity', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve project activity' });
  }
};

export default {
  getAnalyticsOverview,
  getDeploymentTrends,
  getBuildPerformance,
  getProjectActivity,
};

