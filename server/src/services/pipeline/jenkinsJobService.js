import axios from 'axios';
import { validateUrlForSsrf } from '../../utils/ssrfValidator.js';
import logger from '../../utils/logger.js';

/**
 * Jenkins Job Orchestration Service
 * Manages programmatic pipeline creation, build triggering, and status inspection.
 */

const getCsrfCrumb = async (serverUrl, username, apiToken) => {
  try {
    const client = axios.create({
      baseURL: serverUrl.replace(/\/+$/, ''),
      auth: { username: username.trim(), password: apiToken.trim() },
      timeout: 5000,
    });
    const res = await client.get('/crumbIssuer/api/json');
    if (res.data && res.data.crumbRequestField && res.data.crumb) {
      return { [res.data.crumbRequestField]: res.data.crumb };
    }
  } catch {
    // Crumb issuer not enabled or unreachable
  }
  return {};
};

const createJenkinsClient = (serverUrl, username, apiToken, extraHeaders = {}) => {
  return axios.create({
    baseURL: serverUrl.replace(/\/+$/, ''),
    auth: {
      username: username.trim(),
      password: apiToken.trim(),
    },
    headers: {
      'User-Agent': 'PipelineOne-DevOps-Platform',
      ...extraHeaders,
    },
    timeout: 15000,
  });
};

/**
 * Generates Jenkins Pipeline WorkflowJob config XML
 */
export const generatePipelineConfigXml = (jenkinsfileContent) => {
  const sanitizedScript = jenkinsfileContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>Pipeline One Managed Static Website Deployment Job</description>
  <keepDependencies>false</keepDependencies>
  <properties/>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>${sanitizedScript}</script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>`;
};

/**
 * Creates or updates a Jenkins pipeline job
 */
export const createOrUpdateJob = async (serverUrl, username, apiToken, jobName, jenkinsfileContent) => {
  await validateUrlForSsrf(serverUrl);
  const crumbHeaders = await getCsrfCrumb(serverUrl, username, apiToken);
  const client = createJenkinsClient(serverUrl, username, apiToken, crumbHeaders);

  const xmlConfig = generatePipelineConfigXml(jenkinsfileContent);
  const encodedJobName = encodeURIComponent(jobName);

  try {
    // 1. Check if job already exists
    await client.get(`/job/${encodedJobName}/config.xml`);

    // 2. Job exists: Update config
    await client.post(`/job/${encodedJobName}/config.xml`, xmlConfig, {
      headers: { 'Content-Type': 'application/xml', ...crumbHeaders },
    });
    logger.info(`Jenkins job '${jobName}' updated successfully`);
    return { created: false, updated: true, jobName };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      // 3. Job does not exist: Create new item
      await client.post(`/createItem?name=${encodedJobName}`, xmlConfig, {
        headers: { 'Content-Type': 'application/xml', ...crumbHeaders },
      });
      logger.info(`Jenkins job '${jobName}' created successfully`);
      return { created: true, updated: false, jobName };
    }
    throw new Error(`Failed to configure Jenkins job '${jobName}': ${err.message}`);
  }
};

/**
 * Dispatches a build for a Jenkins job
 */
export const triggerBuild = async (serverUrl, username, apiToken, jobName, parameters = null) => {
  await validateUrlForSsrf(serverUrl);
  const crumbHeaders = await getCsrfCrumb(serverUrl, username, apiToken);
  const client = createJenkinsClient(serverUrl, username, apiToken, crumbHeaders);

  const encodedJobName = encodeURIComponent(jobName);
  const endpoint = parameters
    ? `/job/${encodedJobName}/buildWithParameters`
    : `/job/${encodedJobName}/build`;

  const res = await client.post(endpoint, parameters || {}, {
    headers: crumbHeaders,
  });

  // Extract queue item URL from Location header
  const queueUrl = res.headers.location || null;
  let queueId = null;
  if (queueUrl) {
    const match = queueUrl.match(/\/queue\/item\/(\d+)\/?/);
    if (match) queueId = parseInt(match[1], 10);
  }

  logger.info(`Triggered Jenkins job '${jobName}', queueId: ${queueId}`);
  return {
    success: true,
    jobName,
    queueUrl,
    queueId,
  };
};

/**
 * Resolves queue item into assigned build number
 */
export const resolveBuildNumberFromQueue = async (serverUrl, username, apiToken, queueId, maxWaitMs = 25000) => {
  if (!queueId) return null;
  await validateUrlForSsrf(serverUrl);
  const client = createJenkinsClient(serverUrl, username, apiToken);

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await client.get(`/queue/item/${queueId}/api/json`);
      if (res.data && res.data.executable && res.data.executable.number) {
        return res.data.executable.number;
      }
      if (res.data && res.data.cancelled) {
        throw new Error('Jenkins build was cancelled in queue');
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Queue item might have already completed transition
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return null;
};

/**
 * Fetches status of a specific Jenkins build
 */
export const getBuildStatus = async (serverUrl, username, apiToken, jobName, buildNumber) => {
  await validateUrlForSsrf(serverUrl);
  const client = createJenkinsClient(serverUrl, username, apiToken);

  const res = await client.get(`/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`);
  const data = res.data;

  return {
    number: data.number,
    building: Boolean(data.building),
    result: data.result, // 'SUCCESS', 'FAILURE', 'UNSTABLE', 'ABORTED', null if running
    durationMs: data.duration,
    estimatedDurationMs: data.estimatedDuration,
    timestamp: data.timestamp,
    url: data.url,
  };
};

/**
 * Fetches console output text for a Jenkins build
 */
export const getBuildConsoleText = async (serverUrl, username, apiToken, jobName, buildNumber) => {
  await validateUrlForSsrf(serverUrl);
  const client = createJenkinsClient(serverUrl, username, apiToken);

  const res = await client.get(`/job/${encodeURIComponent(jobName)}/${buildNumber}/consoleText`, {
    responseType: 'text',
  });
  return res.data;
};

/**
 * Cancels a running Jenkins build
 */
export const cancelBuild = async (serverUrl, username, apiToken, jobName, buildNumber) => {
  await validateUrlForSsrf(serverUrl);
  const crumbHeaders = await getCsrfCrumb(serverUrl, username, apiToken);
  const client = createJenkinsClient(serverUrl, username, apiToken, crumbHeaders);

  await client.post(`/job/${encodeURIComponent(jobName)}/${buildNumber}/stop`, {}, {
    headers: crumbHeaders,
  });
  logger.info(`Stopped Jenkins build #${buildNumber} for job '${jobName}'`);
  return { success: true, message: `Build #${buildNumber} cancelled` };
};

export default {
  generatePipelineConfigXml,
  createOrUpdateJob,
  triggerBuild,
  resolveBuildNumberFromQueue,
  getBuildStatus,
  getBuildConsoleText,
  cancelBuild,
};
