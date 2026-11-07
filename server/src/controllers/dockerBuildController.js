import db from '../config/db.js';
import { triggerBuildSchema } from '../utils/validators.js';
import dockerBuildService, { buildEvents } from '../services/dockerBuildService.js';
import logger from '../utils/logger.js';

export const triggerBuild = async (req, res, next) => {
  try {
    const validated = triggerBuildSchema.parse(req.body);

    // Fetch project
    const projRes = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [validated.projectId, req.userId]
    );

    if (projRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied',
      });
    }

    const project = projRes.rows[0];

    // Create initial build record in PostgreSQL
    const buildRecord = await dockerBuildService.createBuildRecord({
      userId: req.userId,
      projectId: project.id,
      imageName: validated.imageName,
      imageTag: validated.imageTag || 'latest',
    });

    // Start build asynchronously in background
    dockerBuildService.startDockerBuild({
      buildId: buildRecord.id,
      userId: req.userId,
      project,
      imageName: validated.imageName,
      imageTag: validated.imageTag || 'latest',
      publishToDockerHub: validated.publishToDockerHub,
      dockerHubRepo: validated.dockerHubRepo,
    });

    res.status(201).json({
      success: true,
      message: 'Docker build queued successfully',
      build: buildRecord,
    });
  } catch (err) {
    next(err);
  }
};

export const listBuilds = async (req, res, next) => {
  try {
    const projectId = req.query.projectId;
    let queryText = 'SELECT b.*, p.name as project_name FROM docker_builds b JOIN projects p ON b.project_id = p.id WHERE b.user_id = $1';
    const params = [req.userId];

    if (projectId) {
      queryText += ' AND b.project_id = $2';
      params.push(projectId);
    }

    queryText += ' ORDER BY b.created_at DESC LIMIT 50';

    const result = await db.query(queryText, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      builds: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

export const getBuild = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT b.*, p.name as project_name, p.project_type FROM docker_builds b JOIN projects p ON b.project_id = p.id WHERE b.id = $1 AND b.user_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Build not found',
      });
    }

    const build = result.rows[0];

    // Check if pushed image exists
    const imgRes = await db.query(
      'SELECT * FROM docker_images WHERE docker_build_id = $1',
      [id]
    );

    res.status(200).json({
      success: true,
      build: {
        ...build,
        image: imgRes.rows[0] || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id FROM docker_builds WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Build not found' });
    }

    const logs = dockerBuildService.getBuildLogs(id);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(logs);
  } catch (err) {
    next(err);
  }
};

/**
 * Server-Sent Events (SSE) streaming endpoint for live logs and build progress
 */
export const streamBuildEvents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM docker_builds WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Build not found' });
    }

    // Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    // Send historical logs first
    const historicalLogs = dockerBuildService.getBuildLogs(id);
    res.write(`event: initial_log\ndata: ${JSON.stringify({ logs: historicalLogs })}\n\n`);

    // Listeners for live events
    const onLog = (line) => {
      res.write(`event: log\ndata: ${JSON.stringify({ line })}\n\n`);
    };

    const onStatus = (statusData) => {
      res.write(`event: status\ndata: ${JSON.stringify(statusData)}\n\n`);
      if (['completed', 'failed', 'cancelled'].includes(statusData.status)) {
        cleanup();
        res.end();
      }
    };

    buildEvents.on(`log:${id}`, onLog);
    buildEvents.on(`status:${id}`, onStatus);

    const cleanup = () => {
      buildEvents.removeListener(`log:${id}`, onLog);
      buildEvents.removeListener(`status:${id}`, onStatus);
    };

    req.on('close', cleanup);
  } catch (err) {
    next(err);
  }
};

export const cancelBuild = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id, status FROM docker_builds WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Build not found' });
    }

    const resp = await dockerBuildService.cancelBuild(id, req.userId);
    res.status(200).json(resp);
  } catch (err) {
    next(err);
  }
};

export const checkEngine = async (req, res, next) => {
  try {
    const status = await dockerBuildService.checkDockerAvailability();
    res.status(200).json({
      success: true,
      docker: status,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  triggerBuild,
  listBuilds,
  getBuild,
  getLogs,
  streamBuildEvents,
  cancelBuild,
  checkEngine,
};

