import db from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Get comprehensive deployment analytics for a user
 */
export const getDeploymentAnalytics = async (userId, dateRange = '30d') => {
  let intervalDays = 30;
  if (dateRange === '7d') intervalDays = 7;
  else if (dateRange === '90d') intervalDays = 90;
  else if (dateRange === 'all') intervalDays = 365;

  const dateFilter = `AND created_at >= NOW() - INTERVAL '${intervalDays} days'`;

  // 1. Overall stats and performance aggregates
  const statsRes = await db.query(
    `SELECT
       COUNT(*) as total_executions,
       COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
       COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
       COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_executions,
       COUNT(*) FILTER (WHERE status NOT IN ('success', 'failed', 'cancelled')) as in_progress_executions,
       COALESCE(AVG(duration_seconds) FILTER (WHERE status = 'success' AND duration_seconds > 0), 0) as avg_duration,
       COALESCE(MIN(duration_seconds) FILTER (WHERE status = 'success' AND duration_seconds > 0), 0) as min_duration,
       COALESCE(MAX(duration_seconds) FILTER (WHERE status = 'success' AND duration_seconds > 0), 0) as max_duration
     FROM pipeline_executions
     WHERE user_id = $1 ${dateFilter}`,
    [userId]
  );

  const row = statsRes.rows[0] || {};
  const totalExecutions = parseInt(row.total_executions || '0', 10);
  const successfulExecutions = parseInt(row.successful_executions || '0', 10);
  const failedExecutions = parseInt(row.failed_executions || '0', 10);
  const cancelledExecutions = parseInt(row.cancelled_executions || '0', 10);
  const inProgressExecutions = parseInt(row.in_progress_executions || '0', 10);

  const completedEligible = successfulExecutions + failedExecutions;
  const successRate = completedEligible > 0 ? Math.round((successfulExecutions / completedEligible) * 100) : 0;

  const avgDurationSeconds = Math.round(parseFloat(row.avg_duration || 0));
  const fastestBuildSeconds = parseInt(row.min_duration || '0', 10);
  const slowestBuildSeconds = parseInt(row.max_duration || '0', 10);

  // 2. Daily breakdown trend
  const trendRes = await db.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'success') as success,
       COUNT(*) FILTER (WHERE status = 'failed') as failed
     FROM pipeline_executions
     WHERE user_id = $1 ${dateFilter}
     GROUP BY DATE_TRUNC('day', created_at)
     ORDER BY DATE_TRUNC('day', created_at) ASC`,
    [userId]
  );

  const dailyTrends = trendRes.rows.map((r) => ({
    date: r.date,
    total: parseInt(r.total || '0', 10),
    success: parseInt(r.success || '0', 10),
    failed: parseInt(r.failed || '0', 10),
  }));

  // 3. Project-wise activity distribution
  const projectStatsRes = await db.query(
    `SELECT
       p.id as project_id,
       p.name as project_name,
       p.framework as framework,
       COUNT(e.id) as total_executions,
       COUNT(e.id) FILTER (WHERE e.status = 'success') as successful_executions,
       COUNT(e.id) FILTER (WHERE e.status = 'failed') as failed_executions,
       COALESCE(AVG(e.duration_seconds) FILTER (WHERE e.status = 'success' AND e.duration_seconds > 0), 0) as avg_duration
     FROM projects p
     LEFT JOIN pipeline_executions e ON e.project_id = p.id AND e.user_id = $1 ${dateFilter.replace('created_at', 'e.created_at')}
     WHERE p.user_id = $1
     GROUP BY p.id, p.name, p.framework
     ORDER BY total_executions DESC`,
    [userId]
  );

  const projectActivity = projectStatsRes.rows.map((p) => {
    const total = parseInt(p.total_executions || '0', 10);
    const success = parseInt(p.successful_executions || '0', 10);
    const failed = parseInt(p.failed_executions || '0', 10);
    const eligible = success + failed;
    const rate = eligible > 0 ? Math.round((success / eligible) * 100) : 0;

    return {
      projectId: p.project_id,
      projectName: p.project_name,
      framework: p.framework || 'pure_html',
      totalExecutions: total,
      successfulExecutions: success,
      failedExecutions: failed,
      successRate: rate,
      avgDurationSeconds: Math.round(parseFloat(p.avg_duration || 0)),
    };
  });

  return {
    dateRange,
    intervalDays,
    summary: {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      cancelledExecutions,
      inProgressExecutions,
      successRate,
      performance: {
        avgDurationSeconds,
        fastestBuildSeconds,
        slowestBuildSeconds,
        failureCount: failedExecutions,
      },
    },
    dailyTrends,
    projectActivity,
  };
};

export default {
  getDeploymentAnalytics,
};

