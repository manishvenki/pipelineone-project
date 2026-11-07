import db from '../config/db.js';
import env from '../config/env.js';
import { encrypt, decrypt, generateSecureState, validateSecureState } from '../utils/security.js';
import githubService from '../services/githubService.js';
import { logActivity } from '../services/activityService.js';
import { connectPatSchema } from '../utils/validators.js';
import logger from '../utils/logger.js';

/**
 * Helper to fetch and decrypt the user's stored GitHub token
 */
const getUserGitHubToken = async (userId) => {
  const res = await db.query(
    'SELECT access_token_enc FROM connected_integrations WHERE user_id = $1 AND provider = $2',
    [userId, 'github']
  );

  if (res.rows.length === 0) {
    return null;
  }

  return decrypt(res.rows[0].access_token_enc);
};

/**
 * GET /api/integrations/github/connect
 * Generates OAuth authorization URL with cryptographically signed state
 */
export const connectGitHub = (req, res, next) => {
  try {
    if (!env.GITHUB_CLIENT_ID) {
      return res.status(400).json({
        success: false,
        error: 'GitHub OAuth is not configured on the server. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or connect using a Personal Access Token.',
        canUsePat: true,
      });
    }

    const state = generateSecureState(req.userId);
    const authUrl = githubService.getOAuthAuthorizationUrl(state);

    if (req.query.redirect === 'true') {
      return res.redirect(authUrl);
    }

    res.status(200).json({
      success: true,
      authUrl,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/integrations/github/callback
 * Handles OAuth callback from GitHub
 */
export const handleGitHubCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.error('GitHub authorization rejected:', { error, error_description });
      return res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=error&message=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=error&message=Missing+code+or+state+parameter`);
    }

    // Validate signed state and extract userId
    const stateData = validateSecureState(state);
    if (!stateData) {
      return res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=error&message=Invalid+or+expired+OAuth+state`);
    }

    const { userId } = stateData;

    // Exchange code for token
    const tokenData = await githubService.exchangeCodeForAccessToken(code);
    const accessToken = tokenData.access_token;

    // Fetch user GitHub profile
    const profile = await githubService.getGitHubUserProfile(accessToken);

    // Encrypt token
    const encryptedToken = encrypt(accessToken);
    const scopes = tokenData.scope ? tokenData.scope.split(',') : ['repo', 'read:user'];

    // Upsert into connected_integrations
    const upsertSql = `
      INSERT INTO connected_integrations (
        user_id, provider, provider_user_id, provider_username, access_token_enc, scopes, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, provider, provider_username, connected_at
    `;
    const metadata = {
      avatarUrl: profile.avatarUrl,
      htmlUrl: profile.htmlUrl,
      publicRepos: profile.publicRepos,
      connectedVia: 'oauth',
    };

    await db.query(upsertSql, [
      userId,
      'github',
      String(profile.id),
      profile.login,
      encryptedToken,
      scopes,
      JSON.stringify(metadata),
    ]);

    await logActivity(
      userId,
      'GITHUB_CONNECTED',
      `Connected GitHub account @${profile.login}`,
      { githubUser: profile.login }
    );

    res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=success&provider=github&username=${encodeURIComponent(profile.login)}`);
  } catch (err) {
    logger.error('Failed to process GitHub callback:', { error: err.message });
    res.redirect(`${env.CLIENT_URL}/dashboard/integrations?status=error&message=${encodeURIComponent(err.message)}`);
  }
};

/**
 * POST /api/integrations/github/connect-pat
 * Connect GitHub account using Personal Access Token (classic or fine-grained)
 */
export const connectWithPat = async (req, res, next) => {
  try {
    const { personalAccessToken } = connectPatSchema.parse(req.body);

    // Verify token by fetching user profile directly from GitHub
    const profile = await githubService.getGitHubUserProfile(personalAccessToken);

    const encryptedToken = encrypt(personalAccessToken);
    const scopes = ['repo', 'read:user'];

    const upsertSql = `
      INSERT INTO connected_integrations (
        user_id, provider, provider_user_id, provider_username, access_token_enc, scopes, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, provider, provider_username, connected_at
    `;

    const metadata = {
      avatarUrl: profile.avatarUrl,
      htmlUrl: profile.htmlUrl,
      publicRepos: profile.publicRepos,
      connectedVia: 'pat',
    };

    const result = await db.query(upsertSql, [
      req.userId,
      'github',
      String(profile.id),
      profile.login,
      encryptedToken,
      scopes,
      JSON.stringify(metadata),
    ]);

    await logActivity(
      req.userId,
      'GITHUB_CONNECTED',
      `Connected GitHub account @${profile.login} via Personal Access Token`,
      { githubUser: profile.login, method: 'pat' }
    );

    res.status(200).json({
      success: true,
      message: `GitHub account @${profile.login} connected successfully`,
      integration: {
        provider: 'github',
        username: profile.login,
        avatarUrl: profile.avatarUrl,
        connectedAt: result.rows[0].connected_at,
      },
    });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid GitHub Personal Access Token. Please verify token permissions.',
      });
    }
    next(err);
  }
};

/**
 * GET /api/integrations/github/status
 * Check GitHub integration status for authenticated user
 */
export const getGitHubStatus = async (req, res, next) => {
  try {
    const integrationRes = await db.query(
      'SELECT provider_username, scopes, metadata, connected_at FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'github']
    );

    if (integrationRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        connected: false,
        oauthConfigured: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      });
    }

    const item = integrationRes.rows[0];
    const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata || {};

    res.status(200).json({
      success: true,
      connected: true,
      username: item.provider_username,
      avatarUrl: metadata.avatarUrl || null,
      htmlUrl: metadata.htmlUrl || null,
      connectedVia: metadata.connectedVia || 'oauth',
      connectedAt: item.connected_at,
      oauthConfigured: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/integrations/github/disconnect
 * Disconnects GitHub account
 */
export const disconnectGitHub = async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'github']
    );

    await logActivity(
      req.userId,
      'GITHUB_DISCONNECTED',
      'Disconnected GitHub integration'
    );

    res.status(200).json({
      success: true,
      message: 'GitHub account disconnected successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/github/repositories
 * Lists accessible repositories for the connected user
 */
export const getRepositories = async (req, res, next) => {
  try {
    const token = await getUserGitHubToken(req.userId);
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'GitHub account is not connected. Please connect your GitHub account first.',
        requiresConnection: true,
      });
    }

    const { search, visibility, page, per_page } = req.query;
    let repos = await githubService.listUserRepositories(token, {
      visibility,
      page: parseInt(page, 10) || 1,
      per_page: parseInt(per_page, 10) || 100,
    });

    // Optional frontend search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      repos = repos.filter(
        (r) => r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
      );
    }

    res.status(200).json({
      success: true,
      count: repos.length,
      repositories: repos,
    });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'GitHub access token expired or revoked. Please reconnect your GitHub account.',
        reconnectRequired: true,
      });
    }
    next(err);
  }
};

/**
 * GET /api/github/repositories/:owner/:repo
 * Retrieves repository details, branches, root tree, and static analysis
 */
export const getRepositoryDetails = async (req, res, next) => {
  try {
    const token = await getUserGitHubToken(req.userId);
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'GitHub account is not connected.',
        requiresConnection: true,
      });
    }

    const { owner, repo } = req.params;
    const details = await githubService.getRepositoryDetails(token, owner, repo);

    res.status(200).json({
      success: true,
      repository: details,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/github/repositories/:owner/:repo/branches
 */
export const getRepositoryBranches = async (req, res, next) => {
  try {
    const token = await getUserGitHubToken(req.userId);
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'GitHub account is not connected.',
      });
    }

    const { owner, repo } = req.params;
    const branches = await githubService.getRepositoryBranches(token, owner, repo);

    res.status(200).json({
      success: true,
      branches,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  connectGitHub,
  handleGitHubCallback,
  connectWithPat,
  getGitHubStatus,
  disconnectGitHub,
  getRepositories,
  getRepositoryDetails,
  getRepositoryBranches,
};
