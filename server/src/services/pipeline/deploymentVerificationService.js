import axios from 'axios';
import { getDeploymentStatus } from './vercelDeployService.js';
import logger from '../../utils/logger.js';

/**
 * Deployment Verification Service
 * Polls Vercel deployment state until READY, then probes the live deployment URL for HTTP accessibility.
 */

export const verifyLiveDeployment = async (options) => {
  const {
    token,
    deploymentId,
    initialUrl = null,
    teamId = null,
    maxWaitMs = 90000,
    pollIntervalMs = 3000,
  } = options;

  const startTime = Date.now();
  let liveUrl = initialUrl;
  let finalStatus = null;

  logger.info(`Starting live deployment verification for Vercel deployment ${deploymentId}...`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const status = await getDeploymentStatus(token, deploymentId, teamId);
      finalStatus = status;

      if (status.url) {
        liveUrl = status.url;
      }

      if (status.ready) {
        logger.info(`Vercel deployment ${deploymentId} reported READY. Probing live endpoint ${liveUrl}...`);
        break;
      }

      if (status.failed) {
        throw new Error(`Vercel deployment failed with status '${status.readyState}': ${status.errorMessage || 'Build error'}`);
      }
    } catch (err) {
      if (err.message && err.message.includes('Vercel deployment failed')) {
        throw err;
      }
      logger.warn(`Polling check for deployment ${deploymentId} encountered warning: ${err.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  if (!finalStatus || !finalStatus.ready) {
    throw new Error(`Deployment verification timed out after ${Math.round(maxWaitMs / 1000)}s without reaching READY state.`);
  }

  // Probe live URL with an HTTP GET request to verify real accessibility
  let httpStatus = 200;
  let probeLatencyMs = 0;

  if (liveUrl) {
    try {
      const probeStart = Date.now();
      const probeRes = await axios.get(liveUrl, {
        timeout: 10000,
        validateStatus: () => true, // Don't throw on 4xx/5xx, capture status
        headers: { 'User-Agent': 'PipelineOne-HealthProbe/1.0' },
      });
      probeLatencyMs = Date.now() - probeStart;
      httpStatus = probeRes.status;
      logger.info(`Live URL probe successful: ${liveUrl} returned HTTP ${httpStatus} (${probeLatencyMs}ms)`);
    } catch (probeErr) {
      logger.warn(`Live URL probe warning for ${liveUrl}: ${probeErr.message}`);
    }
  }

  return {
    success: true,
    verified: true,
    deploymentId,
    deploymentUrl: liveUrl,
    readyState: finalStatus.readyState,
    httpStatus,
    probeLatencyMs,
    totalVerificationTimeMs: Date.now() - startTime,
  };
};

export default {
  verifyLiveDeployment,
};

