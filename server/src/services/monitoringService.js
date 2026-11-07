import db from '../config/db.js';
import logger from '../utils/logger.js';

// The 10 Canonical Pipeline Stages specified in Prompt Section 5.1
export const CANONICAL_STAGES = [
  { key: 'github_source', label: 'GitHub Source', order: 1 },
  { key: 'jenkins_queue', label: 'Jenkins Queue', order: 2 },
  { key: 'source_checkout', label: 'Source Checkout', order: 3 },
  { key: 'installing_dependencies', label: 'Dependency Installation', order: 4 },
  { key: 'build', label: 'Build & Compile', order: 5 },
  { key: 'static_output_validation', label: 'Static Output Validation', order: 6 },
  { key: 'docker_build', label: 'Docker Container Build', order: 7, optional: true },
  { key: 'docker_hub_publish', label: 'Docker Hub Publishing', order: 8, optional: true },
  { key: 'vercel_deployment', label: 'Vercel Deployment', order: 9 },
  { key: 'deployment_verification', label: 'Deployment Health Verification', order: 10 },
];

/**
 * Get dashboard overview metrics calculated from actual database records
 */
export const getDashboardOverview = async (userId, dateRange = '30d') => {
  let dateFilter = '';
  const now = new Date();

  if (dateRange === '7d') {
    dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
  } else if (dateRange === '30d') {
    dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
  } else if (dateRange === '90d') {
    dateFilter = "AND created_at >= NOW() - INTERVAL '90 days'";
  }

  // 1. Projects count
  const projectsRes = await db.query(
    `SELECT COUNT(*) as count FROM projects WHERE user_id = $1`,
    [userId]
  );
  const totalProjects = parseInt(projectsRes.rows[0]?.count || '0', 10);

  // 2. Executions metrics
  const execStatsRes = await db.query(
    `SELECT 
       COUNT(*) as total_executions,
       COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
       COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
       COUNT(*) FILTER (WHERE status NOT IN ('success', 'failed', 'cancelled')) as running_pipelines,
       COUNT(*) FILTER (WHERE status = 'success' AND deployment_url IS NOT NULL) as successful_deployments
     FROM pipeline_executions
     WHERE user_id = $1 ${dateFilter}`,
    [userId]
  );

  const stats = execStatsRes.rows[0] || {};
  const totalExecutions = parseInt(stats.total_executions || '0', 10);
  const successfulExecutions = parseInt(stats.successful_executions || '0', 10);
  const failedExecutions = parseInt(stats.failed_executions || '0', 10);
  const runningPipelines = parseInt(stats.running_pipelines || '0', 10);
  const successfulDeployments = parseInt(stats.successful_deployments || '0', 10);

  // Completed eligible = successful + failed
  const completedCount = successfulExecutions + failedExecutions;
  const successRate = completedCount > 0 ? Math.round((successfulExecutions / completedCount) * 100) : 0;

  return {
    dateRange,
    totalProjects,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    runningPipelines,
    successfulDeployments,
    successRate,
  };
};

/**
 * Get currently running active pipelines
 */
export const getActivePipelines = async (userId) => {
  const res = await db.query(
    `SELECT 
       e.id,
       e.project_id,
       p.name as project_name,
       p.slug as project_slug,
       p.framework as framework,
       e.branch,
       e.commit_sha,
       e.commit_message,
       e.status,
       e.current_stage,
       e.trigger_source,
       e.started_at,
       e.created_at,
       (
         SELECT message 
         FROM pipeline_events ev 
         WHERE ev.execution_id = e.id 
         ORDER BY ev.created_at DESC 
         LIMIT 1
       ) as latest_event
     FROM pipeline_executions e
     JOIN projects p ON p.id = e.project_id
     WHERE e.user_id = $1 
       AND e.status NOT IN ('success', 'failed', 'cancelled')
     ORDER BY e.created_at DESC`,
    [userId]
  );

  return res.rows.map((row) => {
    const started = row.started_at ? new Date(row.started_at).getTime() : new Date(row.created_at).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));

    return {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      projectSlug: row.project_slug,
      framework: row.framework,
      branch: row.branch,
      commitSha: row.commit_sha,
      commitMessage: row.commit_message,
      status: row.status,
      currentStage: row.current_stage || 'queued',
      triggerSource: row.trigger_source,
      startedAt: row.started_at || row.created_at,
      elapsedSeconds,
      latestEvent: row.latest_event || 'Processing pipeline stage...',
    };
  });
};

/**
 * Get recent pipeline executions
 */
export const getRecentExecutions = async (userId, limit = 10) => {
  const res = await db.query(
    `SELECT 
       e.id,
       e.project_id,
       p.name as project_name,
       p.slug as project_slug,
       pr.full_name as repository_name,
       e.branch,
       e.commit_sha,
       e.commit_message,
       e.trigger_source,
       e.status,
       e.current_stage,
       pc.deployment_environment as environment,
       e.duration_seconds,
       e.deployment_url as live_url,
       e.started_at,
       e.completed_at,
       e.created_at
     FROM pipeline_executions e
     JOIN projects p ON p.id = e.project_id
     LEFT JOIN project_repositories pr ON pr.project_id = p.id
     LEFT JOIN pipeline_configurations pc ON pc.project_id = p.id
     WHERE e.user_id = $1
     ORDER BY e.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return res.rows;
};

/**
 * Get single pipeline execution full details
 */
export const getPipelineExecutionDetails = async (userId, executionId) => {
  const res = await db.query(
    `SELECT 
       e.id,
       e.user_id,
       e.project_id,
       p.name as project_name,
       p.slug as project_slug,
       p.framework as framework,
       pr.full_name as repository_name,
       pr.clone_url as repo_clone_url,
       e.branch,
       e.commit_sha,
       e.commit_message,
       e.trigger_source,
       e.status,
       e.current_stage,
       pc.deployment_environment as environment,
       e.jenkins_job_name,
       e.jenkins_build_number,
       e.docker_image,
       e.docker_digest,
       e.vercel_deployment_id,
       e.deployment_url as live_url,
       e.error_summary as error_message,
       e.duration_seconds,
       e.started_at,
       e.completed_at,
       e.created_at,
       pc.build_command,
       pc.install_command,
       pc.output_directory,
       pc.node_version,
       pc.docker_enabled as build_docker_image,
       pc.docker_publish_enabled as push_to_dockerhub
     FROM pipeline_executions e
     JOIN projects p ON p.id = e.project_id
     LEFT JOIN project_repositories pr ON pr.project_id = p.id
     LEFT JOIN pipeline_configurations pc ON pc.project_id = p.id
     WHERE e.id = $1 AND e.user_id = $2`,
    [executionId, userId]
  );

  if (res.rows.length === 0) {
    throw new Error('Pipeline execution not found or access denied');
  }

  const exec = res.rows[0];
  const stages = await getPipelineStages(userId, executionId);

  return {
    execution: exec,
    stages,
  };
};

/**
 * Reconcile and get the 10 Canonical Workflow Stages for an execution
 */
export const getPipelineStages = async (userId, executionId) => {
  // 1. Fetch recorded stage events from DB
  const [eventsRes, execRes] = await Promise.all([
    db.query(
      `SELECT stage_name, stage_status, started_at, completed_at, duration_ms, error_message, details
       FROM pipeline_stage_events
       WHERE execution_id = $1
       ORDER BY created_at ASC`,
      [executionId]
    ),
    db.query(
      `SELECT e.status, e.current_stage, pc.docker_enabled as build_docker_image, pc.docker_publish_enabled as push_to_dockerhub
       FROM pipeline_executions e
       LEFT JOIN pipeline_configurations pc ON pc.project_id = e.project_id
       WHERE e.id = $1 AND e.user_id = $2`,
      [executionId, userId]
    ),
  ]);

  const exec = execRes.rows[0] || {};
  const recordedMap = new Map();
  for (const row of eventsRes.rows) {
    recordedMap.set(row.stage_name, row);
  }

  const isFailed = exec.status === 'failed';
  const isCancelled = exec.status === 'cancelled';
  const isSuccess = exec.status === 'success';
  const currentStage = exec.current_stage;
  const isDockerEnabled = !!exec.build_docker_image;
  const isDockerPublishEnabled = !!exec.push_to_dockerhub;

  // Build the 10 canonical stages list
  const stages = CANONICAL_STAGES.map((stg) => {
    const recorded = recordedMap.get(stg.key);

    if (recorded) {
      return {
        key: stg.key,
        label: stg.label,
        order: stg.order,
        optional: !!stg.optional,
        status: recorded.stage_status,
        startedAt: recorded.started_at,
        completedAt: recorded.completed_at,
        durationMs: recorded.duration_ms,
        errorMessage: recorded.error_message,
        details: recorded.details || {},
      };
    }

    // Determine derived state if stage wasn't explicitly logged yet
    let status = 'waiting';

    if (stg.key === 'docker_build' && !isDockerEnabled) {
      status = 'skipped';
    } else if (stg.key === 'docker_hub_publish' && (!isDockerEnabled || !isDockerPublishEnabled)) {
      status = 'skipped';
    } else if (isSuccess) {
      status = (stg.optional && !isDockerEnabled) ? 'skipped' : 'completed';
    } else if (isCancelled && (!currentStage || currentStage === 'cancelled')) {
      status = 'cancelled';
    } else if (currentStage === stg.key) {
      status = isFailed ? 'failed' : isCancelled ? 'cancelled' : 'running';
    }

    return {
      key: stg.key,
      label: stg.label,
      order: stg.order,
      optional: !!stg.optional,
      status,
      startedAt: null,
      completedAt: null,
      durationMs: 0,
      errorMessage: null,
      details: {},
    };
  });

  return stages;
};

export default {
  CANONICAL_STAGES,
  getDashboardOverview,
  getActivePipelines,
  getRecentExecutions,
  getPipelineExecutionDetails,
  getPipelineStages,
};
