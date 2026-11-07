import pipelineConfigService from '../services/pipeline/pipelineConfigService.js';
import pipelineTriggerService from '../services/pipeline/pipelineTriggerService.js';
import pipelineExecutionService from '../services/pipeline/pipelineExecutionService.js';
import pipelineStatusService from '../services/pipeline/pipelineStatusService.js';
import pipelineRetryService from '../services/pipeline/pipelineRetryService.js';

export const getConfiguration = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await pipelineConfigService.getConfiguration(projectId, req.userId);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const saveConfiguration = async (req, res, next) => {
  try {
    const { projectId, ...configData } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }
    const saved = await pipelineConfigService.saveConfiguration(projectId, req.userId, configData);
    res.status(200).json({ success: true, config: saved });
  } catch (err) {
    next(err);
  }
};

export const deleteConfiguration = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    await pipelineConfigService.deleteConfiguration(projectId, req.userId);
    res.status(200).json({ success: true, message: 'Configuration deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const triggerRun = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { branch, triggerSource = 'manual' } = req.body || {};

    const execution = await pipelineTriggerService.triggerPipelineRun({
      projectId,
      userId: req.userId,
      branch,
      triggerSource,
    });

    res.status(201).json({
      success: true,
      message: 'Pipeline execution dispatched successfully',
      execution,
    });
  } catch (err) {
    next(err);
  }
};

export const listExecutions = async (req, res, next) => {
  try {
    const { projectId, limit } = req.query;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const executions = await pipelineExecutionService.listExecutions(req.userId, projectId, parsedLimit);
    res.status(200).json({ success: true, executions });
  } catch (err) {
    next(err);
  }
};

export const getExecution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const details = await pipelineExecutionService.getExecutionById(id, req.userId);
    res.status(200).json({ success: true, ...details });
  } catch (err) {
    next(err);
  }
};

export const streamEvents = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Verify user owns this execution
    await pipelineExecutionService.getExecutionById(id, req.userId);
    await pipelineStatusService.handleExecutionStream(req, res, id);
  } catch (err) {
    next(err);
  }
};

export const retryRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    const newExecution = await pipelineRetryService.retryExecution(id, req.userId);
    res.status(201).json({
      success: true,
      message: 'Pipeline retry dispatched successfully',
      execution: newExecution,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resp = await pipelineExecutionService.cancelExecution(id, req.userId);
    res.status(200).json(resp);
  } catch (err) {
    next(err);
  }
};

export default {
  getConfiguration,
  saveConfiguration,
  deleteConfiguration,
  triggerRun,
  listExecutions,
  getExecution,
  streamEvents,
  retryRun,
  cancelRun,
};

