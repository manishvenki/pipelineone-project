import axios from 'axios';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Creates authenticated HTTP client for Vercel API
 */
const createVercelClient = (token, teamId = null) => {
  return axios.create({
    baseURL: VERCEL_API_BASE,
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PipelineOne-DevOps-Platform',
    },
    params: teamId ? { teamId } : {},
    timeout: 10000,
  });
};

/**
 * Returns Vercel OAuth authorization URL
 */
export const getVercelOAuthUrl = (state) => {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const redirectUri = process.env.VERCEL_REDIRECT_URI || `${env.CLIENT_URL}/dashboard/integrations?provider=vercel`;

  if (!clientId) {
    throw new Error('VERCEL_CLIENT_ID is not configured in server environment');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return `https://vercel.com/oauth/authorize?${params.toString()}`;
};

/**
 * Exchanges OAuth authorization code for Vercel access token
 */
export const exchangeVercelCode = async (code) => {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const clientSecret = process.env.VERCEL_CLIENT_SECRET;
  const redirectUri = process.env.VERCEL_REDIRECT_URI || `${env.CLIENT_URL}/dashboard/integrations?provider=vercel`;

  if (!clientId || !clientSecret) {
    throw new Error('Vercel OAuth credentials are not configured');
  }

  const response = await axios.post(
    `${VERCEL_API_BASE}/v2/oauth/access_token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    }
  );

  return response.data;
};

/**
 * Verifies Vercel token and retrieves user account information
 */
export const verifyVercelToken = async (token) => {
  const client = createVercelClient(token);

  try {
    const userRes = await client.get('/v2/user');
    const user = userRes.data.user;

    // Fetch accessible teams
    let teams = [];
    try {
      const teamsRes = await client.get('/v2/teams');
      teams = (teamsRes.data.teams || []).map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        avatar: t.avatar || null,
      }));
    } catch {
      // Teams fetch failure is non-fatal
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        avatar: user.avatar ? `https://vercel.com/api/www/avatar/${user.avatar}?s=60` : null,
      },
      teams,
    };
  } catch (err) {
    if (err.response) {
      if (err.response.status === 401 || err.response.status === 403) {
        throw new Error('Invalid or expired Vercel Access Token');
      }
      throw new Error(`Vercel API error HTTP ${err.response.status}: ${err.response.data?.error?.message || 'Access denied'}`);
    }
    throw new Error(`Failed to connect to Vercel API: ${err.message}`);
  }
};

/**
 * Lists projects belonging to user or team
 */
export const listVercelProjects = async (token, teamId = null) => {
  const client = createVercelClient(token, teamId);
  const res = await client.get('/v9/projects', {
    params: { limit: 50 },
  });

  return (res.data.projects || []).map((p) => ({
    id: p.id,
    name: p.name,
    framework: p.framework || 'other',
    updatedAt: p.updatedAt,
    latestDeployments: (p.latestDeployments || []).slice(0, 3).map((d) => ({
      id: d.id,
      url: d.url ? `https://${d.url}` : null,
      readyState: d.readyState,
      createdAt: d.createdAt,
    })),
  }));
};

export default {
  getVercelOAuthUrl,
  exchangeVercelCode,
  verifyVercelToken,
  listVercelProjects,
};

