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
