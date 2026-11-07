import axios from 'axios';
import { validateUrlForSsrf } from '../utils/ssrfValidator.js';
import logger from '../utils/logger.js';

/**
 * Creates authenticated HTTP client for Jenkins with Basic Auth (username + API Token)
 */
const createJenkinsClient = (serverUrl, username, apiToken, crumb = null) => {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'PipelineOne-DevOps-Platform',
  };

  if (crumb && crumb.crumbRequestField && crumb.crumb) {
    headers[crumb.crumbRequestField] = crumb.crumb;
  }

  return axios.create({
    baseURL: serverUrl.replace(/\/+$/, ''),
    auth: {
      username: username.trim(),
      password: apiToken.trim(),
    },
    headers,
    timeout: 12000,
  });
};

/**
 * Tests connectivity and verifies Jenkins server credentials
 */
export const verifyJenkinsConnection = async (rawUrl, username, apiToken) => {
  const startTime = Date.now();

  // 1. SSRF URL validation
  const ssrfCheck = await validateUrlForSsrf(rawUrl);
  const serverUrl = ssrfCheck.normalizedUrl;

  const client = createJenkinsClient(serverUrl, username, apiToken);

  try {
    // 2. Fetch server root metadata & job summary
    const res = await client.get('/api/json?tree=nodeDescription,mode,numExecutors,jobs[name,url,color,lastBuild[number,result,timestamp]]');
    const responseTimeMs = Date.now() - startTime;
    const jenkinsVersion = res.headers['x-jenkins'] || res.headers['x-jenkins-session'] || 'Detected';

    // 3. Check for CSRF Crumb requirement
    let crumb = null;
    try {
      const crumbRes = await client.get('/crumbIssuer/api/json');
      if (crumbRes.data && crumbRes.data.crumb) {
        crumb = crumbRes.data;
      }
    } catch {
      // CSRF protection may not be enabled or crumb issuer not required
    }

    const jobs = (res.data.jobs || []).map((j) => ({
      name: j.name,
      url: j.url,
      color: j.color,
      status: parseJenkinsColor(j.color),
      lastBuildNumber: j.lastBuild?.number || null,
      lastBuildResult: j.lastBuild?.result || null,
      lastBuildTimestamp: j.lastBuild?.timestamp || null,
    }));

    return {
      success: true,
      serverUrl,
      jenkinsVersion,
      numExecutors: res.data.numExecutors ?? 2,
      jobsCount: jobs.length,
      jobs,
      crumbRequired: Boolean(crumb),
      responseTimeMs,
    };
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      if (status === 401 || status === 403) {
        throw new Error('Jenkins authentication failed: Invalid username or API token');
      }
      throw new Error(`Jenkins server error HTTP ${status}: ${err.response.statusText || 'Access denied'}`);
    }
    throw new Error(`Cannot reach Jenkins server at "${serverUrl}": ${err.message}`);
  }
};

/**
 * Lists available jobs from Jenkins
 */
export const listJenkinsJobs = async (serverUrl, username, apiToken) => {
  await validateUrlForSsrf(serverUrl);
  const client = createJenkinsClient(serverUrl, username, apiToken);

  const res = await client.get('/api/json?tree=jobs[name,url,color,description,lastBuild[number,result,timestamp,duration]]');
  return (res.data.jobs || []).map((j) => ({
    name: j.name,
    url: j.url,
    description: j.description || '',
    color: j.color,
    status: parseJenkinsColor(j.color),
    lastBuild: j.lastBuild
      ? {
          number: j.lastBuild.number,
          result: j.lastBuild.result || 'IN_PROGRESS',
          timestamp: j.lastBuild.timestamp,
          durationMs: j.lastBuild.duration,
        }
      : null,
  }));
};

/**
 * Retrieves details for a specific Jenkins job
 */
export const getJenkinsJobDetails = async (serverUrl, username, apiToken, jobName) => {
  await validateUrlForSsrf(serverUrl);
  const client = createJenkinsClient(serverUrl, username, apiToken);

  const res = await client.get(`/job/${encodeURIComponent(jobName)}/api/json`);
  const data = res.data;

  return {
    name: data.name,
    displayName: data.displayName || data.name,
    description: data.description || '',
    buildable: data.buildable,
    inQueue: data.inQueue,
    nextBuildNumber: data.nextBuildNumber,
    buildsCount: data.builds ? data.builds.length : 0,
    lastBuild: data.lastBuild ? { number: data.lastBuild.number, url: data.lastBuild.url } : null,
    lastSuccessfulBuild: data.lastSuccessfulBuild ? { number: data.lastSuccessfulBuild.number } : null,
    lastFailedBuild: data.lastFailedBuild ? { number: data.lastFailedBuild.number } : null,
  };
};

/**
 * Helper to map Jenkins color strings (blue, red, anime, etc.) to readable statuses
 */
const parseJenkinsColor = (color = '') => {
  if (color.includes('_anime')) return 'BUILDING';
  if (color.startsWith('blue')) return 'SUCCESS';
  if (color.startsWith('red')) return 'FAILED';
  if (color.startsWith('yellow')) return 'UNSTABLE';
  if (color.startsWith('grey') || color.startsWith('disabled')) return 'DISABLED';
  if (color === 'notbuilt') return 'NOT_BUILT';
  return 'UNKNOWN';
};

export default {
  verifyJenkinsConnection,
  listJenkinsJobs,
  getJenkinsJobDetails,
};

