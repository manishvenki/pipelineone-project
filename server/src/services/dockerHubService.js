import axios from 'axios';
import logger from '../utils/logger.js';

const DOCKER_HUB_API = 'https://hub.docker.com/v2';

/**
 * Authenticates against Docker Hub using Username and Personal Access Token
 * Returns temporary JWT for subsequent Docker Hub v2 API calls
 */
export const authenticateDockerHub = async (username, tokenOrPat) => {
  try {
    const response = await axios.post(
      `${DOCKER_HUB_API}/users/login`,
      {
        username: username.trim(),
        password: tokenOrPat.trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    if (response.data && response.data.token) {
      return {
        success: true,
        jwtToken: response.data.token,
      };
    }

    throw new Error('Unexpected response format from Docker Hub');
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      if (status === 401) {
        throw new Error('Invalid Docker Hub username or Personal Access Token');
      }
      if (status === 429) {
        throw new Error('Docker Hub rate limit exceeded. Please wait a few minutes.');
      }
      throw new Error(err.response.data?.detail || err.response.data?.message || `Docker Hub error (${status})`);
    }
    throw new Error(`Failed to reach Docker Hub API: ${err.message}`);
  }
};

/**
 * Retrieves Docker Hub user profile details
 */
export const getDockerHubProfile = async (jwtToken, username) => {
  try {
    const res = await axios.get(`${DOCKER_HUB_API}/user`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
      timeout: 8000,
    });
    return {
      username: res.data.username || username,
      fullName: res.data.full_name || username,
      company: res.data.company || '',
      profileUrl: res.data.profile_url || `https://hub.docker.com/u/${username}`,
      dateJoined: res.data.date_joined,
    };
  } catch {
    // Fallback
    return {
      username,
      fullName: username,
      profileUrl: `https://hub.docker.com/u/${username}`,
    };
  }
};

/**
 * Lists repositories accessible under namespace
 */
export const listRepositories = async (jwtToken, namespace, options = {}) => {
  const { page = 1, pageSize = 25 } = options;
  try {
    const res = await axios.get(`${DOCKER_HUB_API}/repositories/${namespace}/`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
      params: { page, page_size: pageSize },
      timeout: 10000,
    });

    const results = (res.data.results || []).map((repo) => ({
      name: repo.name,
      namespace: repo.namespace,
      fullName: `${repo.namespace}/${repo.name}`,
      description: repo.description,
      isPrivate: repo.is_private,
      pullCount: repo.pull_count,
      starCount: repo.star_count,
      lastUpdated: repo.last_updated,
    }));

    return {
      count: res.data.count || results.length,
      repositories: results,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { count: 0, repositories: [] };
    }
    throw err;
  }
};

/**
 * Lists image tags for a repository
 */
export const listRepositoryTags = async (jwtToken, namespace, repository) => {
  try {
    const res = await axios.get(
      `${DOCKER_HUB_API}/repositories/${namespace}/${repository}/tags/`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
        params: { page_size: 25 },
        timeout: 10000,
      }
    );

    const tags = (res.data.results || []).map((t) => ({
      name: t.name,
      sizeBytes: t.full_size,
      lastUpdated: t.last_updated,
      digest: t.digest || (t.images && t.images[0]?.digest) || null,
    }));

    return {
      count: res.data.count || tags.length,
      tags,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { count: 0, tags: [] };
    }
    throw err;
  }
};

/**
 * Creates a new repository on Docker Hub
 */
export const createRepository = async (jwtToken, namespace, name, description = '', isPrivate = false) => {
  try {
    const res = await axios.post(
      `${DOCKER_HUB_API}/repositories/`,
      {
        namespace,
        name: name.toLowerCase().trim(),
        description,
        is_private: Boolean(isPrivate),
      },
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
    throw new Error(`Failed to create Docker Hub repository: ${msg}`);
  }
};

export default {
  authenticateDockerHub,
  getDockerHubProfile,
  listRepositories,
  listRepositoryTags,
  createRepository,
};

