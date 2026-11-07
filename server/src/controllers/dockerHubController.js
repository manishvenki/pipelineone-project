import db from '../config/db.js';
import { encrypt, decrypt } from '../utils/security.js';
import { connectDockerHubSchema } from '../utils/validators.js';
import dockerHubService from '../services/dockerHubService.js';
import { logActivity } from '../services/activityService.js';
import logger from '../utils/logger.js';

export const connectDockerHub = async (req, res, next) => {
  try {
    const { username, personalAccessToken } = connectDockerHubSchema.parse(req.body);
    const startTime = Date.now();

    // 1. Authenticate against Docker Hub
    const authResult = await dockerHubService.authenticateDockerHub(username, personalAccessToken);
    const profile = await dockerHubService.getDockerHubProfile(authResult.jwtToken, username);
    const responseTimeMs = Date.now() - startTime;

    // 2. Encrypt PAT
    const encryptedToken = encrypt(personalAccessToken);

    const upsertSql = `
      INSERT INTO connected_integrations (
        user_id, provider, provider_user_id, provider_username, access_token_enc, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, provider, provider_username, connected_at
    `;

    const metadata = {
      fullName: profile.fullName,
      profileUrl: profile.profileUrl,
      company: profile.company,
      dateJoined: profile.dateJoined,
      lastVerifiedAt: new Date().toISOString(),
    };

    const result = await db.query(upsertSql, [
      req.userId,
      'dockerhub',
      username,
      username,
      encryptedToken,
      JSON.stringify(metadata),
    ]);

    // 3. Log verification event in PostgreSQL
    await db.query(
      `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.userId,
        'dockerhub',
        'verified',
        'Credentials verified successfully with Docker Hub v2 API',
        responseTimeMs,
        JSON.stringify({ username }),
      ]
    );

    await logActivity(
      req.userId,
      'DOCKERHUB_CONNECTED',
      `Connected Docker Hub account @${username}`,
      { dockerUser: username }
    );

    res.status(200).json({
      success: true,
      message: `Docker Hub account @${username} connected successfully`,
      integration: {
        provider: 'dockerhub',
        username,
        connectedAt: result.rows[0].connected_at,
        metadata,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getDockerHubStatus = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT provider_username, metadata, connected_at FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'dockerhub']
    );

    if (intRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        connected: false,
      });
    }

    const row = intRes.rows[0];
    const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {};

    // Get last verification event
    const eventRes = await db.query(
      'SELECT status, message, response_time_ms, created_at FROM integration_verification_events WHERE user_id = $1 AND provider = $2 ORDER BY created_at DESC LIMIT 1',
      [req.userId, 'dockerhub']
    );

    res.status(200).json({
      success: true,
      connected: true,
      username: row.provider_username,
      connectedAt: row.connected_at,
      metadata,
      lastVerification: eventRes.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyDockerHub = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT access_token_enc, provider_username FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'dockerhub']
    );

    if (intRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Docker Hub is not connected.',
      });
    }

    const { access_token_enc, provider_username } = intRes.rows[0];
    const pat = decrypt(access_token_enc);
    const startTime = Date.now();

    try {
      await dockerHubService.authenticateDockerHub(provider_username, pat);
      const responseTimeMs = Date.now() - startTime;

      await db.query(
        `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'dockerhub', 'verified', 'Docker Hub credentials re-verified successfully', responseTimeMs]
      );

      res.status(200).json({
        success: true,
        message: 'Docker Hub connection verified successfully',
        responseTimeMs,
        verifiedAt: new Date().toISOString(),
      });
    } catch (err) {
      await db.query(
        `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'dockerhub', 'failed', err.message, Date.now() - startTime]
      );

      res.status(400).json({
        success: false,
        error: `Verification failed: ${err.message}`,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const disconnectDockerHub = async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'dockerhub']
    );

    await logActivity(req.userId, 'DOCKERHUB_DISCONNECTED', 'Disconnected Docker Hub integration');

    res.status(200).json({
      success: true,
      message: 'Docker Hub disconnected successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getRepositories = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT access_token_enc, provider_username FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'dockerhub']
    );

    if (intRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Docker Hub is not connected.',
      });
    }

    const { access_token_enc, provider_username } = intRes.rows[0];
    const pat = decrypt(access_token_enc);

    const authResult = await dockerHubService.authenticateDockerHub(provider_username, pat);
    const repos = await dockerHubService.listRepositories(authResult.jwtToken, provider_username, {
      page: parseInt(req.query.page, 10) || 1,
      pageSize: parseInt(req.query.pageSize, 10) || 25,
    });

    res.status(200).json({
      success: true,
      ...repos,
    });
  } catch (err) {
    next(err);
  }
};

export const getRepositoryTags = async (req, res, next) => {
  try {
    const { namespace, repository } = req.params;
    const intRes = await db.query(
      'SELECT access_token_enc, provider_username FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'dockerhub']
    );

    if (intRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Docker Hub is not connected.',
      });
    }

    const { access_token_enc, provider_username } = intRes.rows[0];
    const pat = decrypt(access_token_enc);

    const authResult = await dockerHubService.authenticateDockerHub(provider_username, pat);
    const tags = await dockerHubService.listRepositoryTags(
      authResult.jwtToken,
      namespace || provider_username,
      repository
    );

    res.status(200).json({
      success: true,
      ...tags,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  connectDockerHub,
  getDockerHubStatus,
  verifyDockerHub,
  disconnectDockerHub,
  getRepositories,
  getRepositoryTags,
};
