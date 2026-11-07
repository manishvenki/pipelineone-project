import axios from 'axios';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { analyzeStaticProject } from './projectDetectionService.js';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Returns GitHub OAuth Authorization URL
 */
export const getOAuthAuthorizationUrl = (state) => {
  if (!env.GITHUB_CLIENT_ID) {
    throw new Error('GITHUB_CLIENT_ID is not configured in environment variables');
  }

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'repo,read:user,user:email',
    state,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

/**
 * Exchanges authorization code for an OAuth access token
 */
export const exchangeCodeForAccessToken = async (code) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    },
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (response.data.error) {
    throw new Error(`GitHub OAuth error: ${response.data.error_description || response.data.error}`);
  }

  return response.data; // contains access_token, scope, token_type
};

/**
 * Creates authenticated Axios instance for GitHub API calls
 */
const createGitHubClient = (accessToken) => {
  return axios.create({
    baseURL: GITHUB_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'PipelineOne-DevOps-Platform',
    },
    timeout: 10000,
  });
};

/**
 * Fetches authenticated user's profile from GitHub
 */
export const getGitHubUserProfile = async (accessToken) => {
  const client = createGitHubClient(accessToken);
  const response = await client.get('/user');
  return {
    id: response.data.id,
    login: response.data.login,
    name: response.data.name || response.data.login,
    avatarUrl: response.data.avatar_url,
    htmlUrl: response.data.html_url,
    publicRepos: response.data.public_repos,
    totalPrivateRepos: response.data.total_private_repos || 0,
  };
};

/**
 * Lists repositories accessible to the user
 */
export const listUserRepositories = async (accessToken, queryOptions = {}) => {
  const client = createGitHubClient(accessToken);
  const { sort = 'updated', per_page = 100, page = 1, visibility = 'all' } = queryOptions;

  const response = await client.get('/user/repos', {
    params: {
      sort,
      per_page,
      page,
      visibility,
      affiliation: 'owner,collaborator,organization_member',
    },
  });

  return response.data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: {
      login: repo.owner.login,
      avatarUrl: repo.owner.avatar_url,
      type: repo.owner.type,
    },
    isPrivate: repo.private,
    description: repo.description,
    defaultBranch: repo.default_branch || 'main',
    language: repo.language || 'Unknown',
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    cloneUrl: repo.clone_url,
    htmlUrl: repo.html_url,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    sizeKb: repo.size,
  }));
};

/**
 * Retrieves repository details, branch list, root file structure, and README
 */
export const getRepositoryDetails = async (accessToken, owner, repo) => {
  const client = createGitHubClient(accessToken);

  try {
    const [repoRes, branchesRes] = await Promise.all([
      client.get(`/repos/${owner}/${repo}`),
      client.get(`/repos/${owner}/${repo}/branches?per_page=100`),
    ]);

    const repoData = repoRes.data;
    const branches = branchesRes.data.map((b) => ({
      name: b.name,
      commitSha: b.commit.sha,
      isProtected: b.protected,
    }));

    // Fetch root contents
    let rootContents = [];
    try {
      const contentsRes = await client.get(`/repos/${owner}/${repo}/contents`);
      rootContents = contentsRes.data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type, // 'file' or 'dir'
        size: item.size,
        downloadUrl: item.download_url,
      }));
    } catch (err) {
      // Empty repo has no root contents
      logger.warn(`Could not fetch root contents for ${owner}/${repo}: ${err.message}`);
    }

    // Fetch README if available
    let readme = null;
    try {
      const readmeRes = await client.get(`/repos/${owner}/${repo}/readme`);
      if (readmeRes.data && readmeRes.data.content) {
        readme = Buffer.from(readmeRes.data.content, 'base64').toString('utf8');
      }
    } catch {
      // No readme is not an error
    }

    // Fetch latest commit
    let latestCommit = null;
    try {
      const commitsRes = await client.get(`/repos/${owner}/${repo}/commits?per_page=1`);
      if (commitsRes.data && commitsRes.data.length > 0) {
        const c = commitsRes.data[0];
        latestCommit = {
          sha: c.sha,
          message: c.commit.message,
          authorName: c.commit.author.name,
          date: c.commit.author.date,
        };
      }
    } catch {
      // Ignore commit fetch errors
    }

    // Fetch package.json if present to analyze project type
    let packageJsonContent = null;
    const packageItem = rootContents.find((item) => item.name === 'package.json');
    if (packageItem && packageItem.downloadUrl) {
      try {
        const pkgRes = await axios.get(packageItem.downloadUrl);
        packageJsonContent = pkgRes.data;
      } catch {
        // Ignore
      }
    }

    // Analyze static project
    const fileList = rootContents.map((item) => item.path);
    const analysis = analyzeStaticProject(fileList, packageJsonContent);

    return {
      id: repoData.id,
      name: repoData.name,
      fullName: repoData.full_name,
      owner: {
        login: repoData.owner.login,
        avatarUrl: repoData.owner.avatar_url,
      },
      isPrivate: repoData.private,
      description: repoData.description,
      defaultBranch: repoData.default_branch || 'main',
      branches,
      rootContents,
      readme,
      latestCommit,
      analysis,
      cloneUrl: repoData.clone_url,
      htmlUrl: repoData.html_url,
      updatedAt: repoData.updated_at,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new Error(`Repository ${owner}/${repo} not found or inaccessible`);
    }
    throw err;
  }
};

/**
 * Retrieves branches for a repository
 */
export const getRepositoryBranches = async (accessToken, owner, repo) => {
  const client = createGitHubClient(accessToken);
  const response = await client.get(`/repos/${owner}/${repo}/branches?per_page=100`);
  return response.data.map((b) => ({
    name: b.name,
    commitSha: b.commit.sha,
    isProtected: b.protected,
  }));
};

export default {
  getOAuthAuthorizationUrl,
  exchangeCodeForAccessToken,
  getGitHubUserProfile,
  listUserRepositories,
  getRepositoryDetails,
  getRepositoryBranches,
};
