import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password is too long'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const selectRepoSchema = z.object({
  repoId: z.number().or(z.string()).optional(),
  owner: z.string().trim().min(1, 'Repository owner is required'),
  name: z.string().trim().min(1, 'Repository name is required'),
  fullName: z.string().trim().min(1, 'Repository full name is required'),
  defaultBranch: z.string().trim().default('main'),
  selectedBranch: z.string().trim().default('main'),
  cloneUrl: z.string().url().optional().or(z.literal('')),
  isPrivate: z.boolean().default(false),
  description: z.string().max(500).optional().nullable(),
});

export const updateSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  notifications_enabled: z.boolean().optional(),
  auto_deploy_enabled: z.boolean().optional(),
});

export const connectPatSchema = z.object({
  personalAccessToken: z
    .string()
    .trim()
    .min(10, 'Personal Access Token must be at least 10 characters long')
    .startsWith('ghp_', { message: 'GitHub Personal Access Tokens typically start with ghp_' })
    .or(z.string().trim().min(20)),
});

// Phase 2: Docker Hub validation
export const connectDockerHubSchema = z.object({
  username: z.string().trim().min(2, 'Docker Hub username is required').max(100),
  personalAccessToken: z.string().trim().min(8, 'Docker Hub Personal Access Token is required'),
});

// Phase 2: Jenkins validation
export const connectJenkinsSchema = z.object({
  serverUrl: z.string().trim().url('Invalid Jenkins server URL (must start with http:// or https://)'),
  username: z.string().trim().min(1, 'Jenkins username is required'),
  apiToken: z.string().trim().min(1, 'Jenkins API token is required'),
  displayName: z.string().trim().max(100).optional(),
});

// Phase 2: Vercel Token validation
export const connectVercelSchema = z.object({
  token: z.string().trim().min(10, 'Vercel access token is required'),
});

// Phase 2: Docker Build Trigger validation
export const triggerBuildSchema = z.object({
  projectId: z.string().uuid().or(z.string().min(1, 'Project ID is required')),
  imageName: z
    .string()
    .trim()
    .min(1, 'Image name is required')
    .regex(/^[a-z0-9-_./]+$/, 'Image name must contain only lowercase alphanumeric characters, dots, dashes, and slashes'),
  imageTag: z.string().trim().default('latest'),
  publishToDockerHub: z.boolean().default(false),
  dockerHubRepo: z.string().trim().optional().nullable(),
});

// Phase 2: Vercel Project Configuration
export const configureVercelSchema = z.object({
  projectId: z.string().min(1),
  vercelProjectId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  framework: z.string().optional().default('other'),
  buildCommand: z.string().optional().nullable(),
  outputDirectory: z.string().optional().default('dist'),
});

