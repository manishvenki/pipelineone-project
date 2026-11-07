import db from '../config/db.js';
import { encrypt, decrypt } from '../utils/security.js';
import { connectJenkinsSchema } from '../utils/validators.js';
import jenkinsService from '../services/jenkinsService.js';
import { logActivity } from '../services/activityService.js';
import logger from '../utils/logger.js';

export const connectJenkins = async (req, res, next) => {
  try {
    const { serverUrl, username, apiToken, displayName } = connectJenkinsSchema.parse(req.body);

    // 1. Verify connection & SSRF defense
    const verification = await jenkinsService.verifyJenkinsConnection(serverUrl, username, apiToken);

    // 2. Encrypt API token
    const encryptedToken = encrypt(apiToken);

    const upsertSql = `
      INSERT INTO connected_integrations (
        user_id, provider, provider_user_id, provider_username, access_token_enc, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, provider, provider_username, connected_at
    `;

    const metadata = {
      serverUrl: verification.serverUrl,
      jenkinsVersion: verification.jenkinsVersion,
      displayName: displayName || 'Jenkins Server',
      jobsCount: verification.jobsCount,
      numExecutors: verification.numExecutors,
      lastVerifiedAt: new Date().toISOString(),
    };

    const result = await db.query(upsertSql, [
      req.userId,
      'jenkins',
      username,
      username,
      encryptedToken,
      JSON.stringify(metadata),
    ]);

    // Store platform connection metadata
    await db.query(
      `INSERT INTO platform_connection_metadata (user_id, provider, config)
       VALUES ($1, $2, $3)`,
      [req.userId, 'jenkins', JSON.stringify({ serverUrl: verification.serverUrl, displayName })]
    );

    // Log verification event
    await db.query(
      `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.userId,
        'jenkins',
        'verified',
        `Connected to Jenkins ${verification.jenkinsVersion} with ${verification.jobsCount} accessible jobs`,
        verification.responseTimeMs,
        JSON.stringify({ serverUrl: verification.serverUrl }),
      ]
    );

    await logActivity(
      req.userId,
      'JENKINS_CONNECTED',
      `Connected Jenkins server at ${verification.serverUrl}`,
      { serverUrl: verification.serverUrl, version: verification.jenkinsVersion }
    );

    res.status(200).json({
      success: true,
      message: `Jenkins server connected and verified successfully (${verification.jenkinsVersion})`,
      integration: {
        provider: 'jenkins',
        username,
        connectedAt: result.rows[0].connected_at,
        metadata,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getJenkinsStatus = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT provider_username, metadata, connected_at FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'jenkins']
    );

    if (intRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        connected: false,
      });
    }

    const row = intRes.rows[0];
    const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {};

    const eventRes = await db.query(
      'SELECT status, message, response_time_ms, created_at FROM integration_verification_events WHERE user_id = $1 AND provider = $2 ORDER BY created_at DESC LIMIT 1',
      [req.userId, 'jenkins']
    );

    res.status(200).json({
      success: true,
      connected: true,
      username: row.provider_username,
      serverUrl: metadata.serverUrl,
      jenkinsVersion: metadata.jenkinsVersion,
      connectedAt: row.connected_at,
      metadata,
      lastVerification: eventRes.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyJenkins = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT access_token_enc, provider_username, metadata FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'jenkins']
    );

    if (intRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Jenkins is not connected.',
      });
    }

    const { access_token_enc, provider_username, metadata: metaRaw } = intRes.rows[0];
    const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw || {};
    const apiToken = decrypt(access_token_enc);

    try {
      const verification = await jenkinsService.verifyJenkinsConnection(
        meta.serverUrl,
        provider_username,
        apiToken
      );

      await db.query(
        `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'jenkins', 'verified', 'Jenkins re-verified successfully', verification.responseTimeMs]
      );

      res.status(200).json({
        success: true,
        message: 'Jenkins server verified successfully',
        verification,
      });
    } catch (err) {
      await db.query(
        `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'jenkins', 'failed', err.message, 0]
      );

      res.status(400).json({
        success: false,
        error: `Jenkins verification failed: ${err.message}`,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const disconnectJenkins = async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'jenkins']
    );
    await db.query(
      'DELETE FROM platform_connection_metadata WHERE user_id = $1 AND provider = $2',
      [req.userId, 'jenkins']
    );

    await logActivity(req.userId, 'JENKINS_DISCONNECTED', 'Disconnected Jenkins server integration');

    res.status(200).json({
      success: true,
      message: 'Jenkins server disconnected successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getJobs = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT access_token_enc, provider_username, metadata FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'jenkins']
    );

    if (intRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Jenkins is not connected.',
      });
    }

    const { access_token_enc, provider_username, metadata: metaRaw } = intRes.rows[0];
    const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw || {};
    const apiToken = decrypt(access_token_enc);

    const jobs = await jenkinsService.listJenkinsJobs(meta.serverUrl, provider_username, apiToken);

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (err) {
    next(err);
  }
};

export const getJobDetails = async (req, res, next) => {
  try {
    const { jobName } = req.params;
    const intRes = await db.query(
      'SELECT access_token_enc, provider_username, metadata FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'jenkins']
    );

    if (intRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Jenkins is not connected.',
      });
    }

    const { access_token_enc, provider_username, metadata: metaRaw } = intRes.rows[0];
    const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw || {};
    const apiToken = decrypt(access_token_enc);

    const details = await jenkinsService.getJenkinsJobDetails(
      meta.serverUrl,
      provider_username,
      apiToken,
      jobName
    );

    res.status(200).json({
      success: true,
      job: details,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  connectJenkins,
  getJenkinsStatus,
  verifyJenkins,
  disconnectJenkins,
  getJobs,
  getJobDetails,
};

