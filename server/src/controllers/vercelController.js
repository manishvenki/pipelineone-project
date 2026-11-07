import db from '../config/db.js';
import { encrypt, decrypt, generateSecureState, validateSecureState } from '../utils/security.js';
import { connectVercelSchema, configureVercelSchema } from '../utils/validators.js';
import vercelService from '../services/vercelService.js';
import { logActivity } from '../services/activityService.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

export const getOAuthUrl = (req, res, next) => {
  try {
    const state = generateSecureState(req.userId);
    const authUrl = vercelService.getVercelOAuthUrl(state);
    res.status(200).json({ success: true, authUrl });
  } catch (err) {
    next(err);
  }
};

export const handleOAuthCallback = async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=error&message=${encodeURIComponent(error)}`);
    }

    const stateData = validateSecureState(state);
    if (!stateData) {
      return res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=error&message=Invalid+or+expired+OAuth+state`);
    }

    const { userId } = stateData;
    const tokenData = await vercelService.exchangeVercelCode(code);
    const token = tokenData.access_token;

    const verification = await vercelService.verifyVercelToken(token);
    const encryptedToken = encrypt(token);

    const upsertSql = `
      INSERT INTO connected_integrations (
        user_id, provider, provider_user_id, provider_username, access_token_enc, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, provider, provider_username, connected_at
    `;

    const metadata = {
      name: verification.user.name,
      email: verification.user.email,
      avatar: verification.user.avatar,
      teamsCount: verification.teams.length,
      teams: verification.teams,
      lastVerifiedAt: new Date().toISOString(),
      connectedVia: 'oauth',
    };

    await db.query(upsertSql, [
      userId,
      'vercel',
      verification.user.id,
      verification.user.username,
      encryptedToken,
      JSON.stringify(metadata),
    ]);

    await logActivity(
      userId,
      'VERCEL_CONNECTED',
      `Connected Vercel account @${verification.user.username}`,
      { vercelUser: verification.user.username }
    );

    res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=success&provider=vercel&username=${encodeURIComponent(verification.user.username)}`);
  } catch (err) {
    res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=error&message=${encodeURIComponent(err.message)}`);
  }
};

export const connectWithToken = async (req, res, next) => {
  try {
    const { token } = connectVercelSchema.parse(req.body);
    const startTime = Date.now();

    const verification = await vercelService.verifyVercelToken(token);
    const responseTimeMs = Date.now() - startTime;
    const encryptedToken = encrypt(token);

    const upsertSql = `
      INSERT INTO connected_integrations (
        user_id, provider, provider_user_id, provider_username, access_token_enc, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, provider, provider_username, connected_at
    `;

    const metadata = {
      name: verification.user.name,
      email: verification.user.email,
      avatar: verification.user.avatar,
      teamsCount: verification.teams.length,
      teams: verification.teams,
      lastVerifiedAt: new Date().toISOString(),
      connectedVia: 'token',
    };

    const result = await db.query(upsertSql, [
      req.userId,
      'vercel',
      verification.user.id,
      verification.user.username,
      encryptedToken,
      JSON.stringify(metadata),
    ]);

    await db.query(
      `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.userId,
        'vercel',
        'verified',
        `Connected to Vercel account @${verification.user.username}`,
        responseTimeMs,
        JSON.stringify({ teamsCount: verification.teams.length }),
      ]
    );

    await logActivity(
      req.userId,
      'VERCEL_CONNECTED',
      `Connected Vercel account @${verification.user.username} via Access Token`,
      { vercelUser: verification.user.username }
    );

    res.status(200).json({
      success: true,
      message: `Vercel account @${verification.user.username} connected successfully`,
      integration: {
        provider: 'vercel',
        username: verification.user.username,
        connectedAt: result.rows[0].connected_at,
        metadata,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getVercelStatus = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT provider_username, metadata, connected_at FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'vercel']
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
      [req.userId, 'vercel']
    );

    res.status(200).json({
      success: true,
      connected: true,
      username: row.provider_username,
      name: metadata.name,
      avatar: metadata.avatar,
      teams: metadata.teams || [],
      connectedAt: row.connected_at,
      metadata,
      lastVerification: eventRes.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyVercel = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT access_token_enc FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'vercel']
    );

    if (intRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vercel is not connected.',
      });
    }

    const token = decrypt(intRes.rows[0].access_token_enc);
    const startTime = Date.now();

    try {
      const verification = await vercelService.verifyVercelToken(token);
      const responseTimeMs = Date.now() - startTime;

      await db.query(
        `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'vercel', 'verified', 'Vercel token re-verified successfully', responseTimeMs]
      );

      res.status(200).json({
        success: true,
        message: 'Vercel connection verified successfully',
        verification,
      });
    } catch (err) {
      await db.query(
        `INSERT INTO integration_verification_events (user_id, provider, status, message, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.userId, 'vercel', 'failed', err.message, 0]
      );

      res.status(400).json({
        success: false,
        error: `Vercel verification failed: ${err.message}`,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const disconnectVercel = async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'vercel']
    );

    await logActivity(req.userId, 'VERCEL_DISCONNECTED', 'Disconnected Vercel integration');

    res.status(200).json({
      success: true,
      message: 'Vercel integration disconnected successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const intRes = await db.query(
      'SELECT access_token_enc FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'vercel']
    );

    if (intRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vercel is not connected.',
      });
    }

    const token = decrypt(intRes.rows[0].access_token_enc);
    const teamId = req.query.teamId || null;
    const projects = await vercelService.listVercelProjects(token, teamId);

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (err) {
    next(err);
  }
};

export const configureProject = async (req, res, next) => {
  try {
    const validated = configureVercelSchema.parse(req.body);

    const upsertSql = `
      INSERT INTO platform_connection_metadata (user_id, provider, config)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const config = {
      projectId: validated.projectId,
      vercelProjectId: validated.vercelProjectId,
      teamId: validated.teamId,
      framework: validated.framework,
      buildCommand: validated.buildCommand,
      outputDirectory: validated.outputDirectory,
      configuredAt: new Date().toISOString(),
    };

    const result = await db.query(upsertSql, [
      req.userId,
      `vercel_project_${validated.projectId}`,
      JSON.stringify(config),
    ]);

    res.status(200).json({
      success: true,
      message: 'Vercel project deployment configuration saved',
      config: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getOAuthUrl,
  handleOAuthCallback,
  connectWithToken,
  getVercelStatus,
  verifyVercel,
  disconnectVercel,
  getProjects,
  configureProject,
};
