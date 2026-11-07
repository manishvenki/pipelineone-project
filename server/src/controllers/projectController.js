import path from 'path';
import fs from 'fs';
import db from '../config/db.js';
import { safelyExtractZip } from '../services/zipService.js';
import { analyzeStaticProject } from '../services/projectDetectionService.js';
import githubService from '../services/githubService.js';
import { logActivity } from '../services/activityService.js';
import { decrypt } from '../utils/security.js';
import { selectRepoSchema } from '../utils/validators.js';
import { getMongoStatus } from '../config/mongo.js';
import ProjectScanLog from '../models/MongoScanLog.js';
import logger from '../utils/logger.js';

const storageBaseDir = path.resolve(process.cwd(), 'storage');
if (!fs.existsSync(storageBaseDir)) {
  fs.mkdirSync(storageBaseDir, { recursive: true });
}

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `proj-${Date.now()}`;
};

/**
 * GET /api/projects
 * Lists all projects belonging to the authenticated user
 */
export const getProjects = async (req, res, next) => {
  try {
    const projectsRes = await db.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    const projects = [];
    for (const proj of projectsRes.rows) {
      let repo = null;
      if (proj.source_type === 'github') {
        const repoRes = await db.query(
          'SELECT * FROM project_repositories WHERE project_id = $1',
          [proj.id]
        );
        repo = repoRes.rows[0] || null;
      }

      projects.push({
        ...proj,
        repository: repo,
      });
    }

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/projects/:id
 * Retrieves a single project by ID with repository details
 */
export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const projectRes = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    const project = projectRes.rows[0];
    let repository = null;

    if (project.source_type === 'github') {
      const repoRes = await db.query(
        'SELECT * FROM project_repositories WHERE project_id = $1',
        [project.id]
      );
      repository = repoRes.rows[0] || null;
    }

    res.status(200).json({
      success: true,
      project: {
        ...project,
        repository,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/projects/:id
 * Deletes a project and its associated local storage if any
 */
export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const projectRes = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or you do not have permission to delete it',
      });
    }

    const project = projectRes.rows[0];

    // Remove local storage folder if zip project
    if (project.storage_path && fs.existsSync(project.storage_path)) {
      try {
        fs.rmSync(project.storage_path, { recursive: true, force: true });
      } catch (e) {
        logger.warn(`Could not delete storage directory for project ${project.id}: ${e.message}`);
      }
    }

    await db.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, req.userId]);

    await logActivity(
      req.userId,
      'PROJECT_DELETED',
      `Deleted project "${project.name}"`,
      { projectId: project.id, projectName: project.name }
    );

    res.status(200).json({
      success: true,
      message: `Project "${project.name}" deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/projects/upload
 * Handles direct ZIP file upload, safe extraction, static project detection, and project registration
 */
export const uploadProjectZip = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No ZIP file uploaded',
    });
  }

  const uploadedZipPath = req.file.path;

  try {
    const projectName = req.body.name?.trim() || path.basename(req.file.originalname, path.extname(req.file.originalname));
    const slugBase = generateSlug(projectName);
    const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-4)}`;

    const targetExtractDir = path.resolve(storageBaseDir, req.userId, uniqueSlug);

    // Safely extract archive with Zip Slip and Zip Bomb protection
    const extractionResult = await safelyExtractZip(uploadedZipPath, targetExtractDir);

    const { analysis, extractedFilesCount, fileTree } = extractionResult;

    // Save project record in PostgreSQL
    const insertProjectSql = `
      INSERT INTO projects (
        user_id, name, slug, description, source_type, project_type, framework,
        build_command, output_directory, storage_path, status, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const metadata = {
      originalFileName: req.file.originalname,
      fileSizeBytes: req.file.size,
      totalFilesCount: extractedFilesCount,
      markers: analysis.markers,
      fileTreePreview: fileTree,
    };

    const projectResult = await db.query(insertProjectSql, [
      req.userId,
      projectName,
      uniqueSlug,
      req.body.description || `Uploaded ZIP project (${req.file.originalname})`,
      'zip',
      analysis.detectedType,
      analysis.framework,
      analysis.buildCommand,
      analysis.outputDirectory,
      targetExtractDir,
      'ready',
      JSON.stringify(metadata),
    ]);

    const createdProject = projectResult.rows[0];

    // Optional MongoDB document storage if MongoDB Atlas is connected
    const mongoStatus = getMongoStatus();
    if (mongoStatus.isConnected) {
      try {
        await ProjectScanLog.create({
          projectId: createdProject.id,
          userId: req.userId,
          sourceType: 'zip',
          detectedType: analysis.detectedType,
          framework: analysis.framework,
          fileTree: extractionResult.extractedFiles,
          heuristics: analysis.markers,
        });
      } catch (mErr) {
        logger.warn('Failed to save scan record to MongoDB Atlas:', { error: mErr.message });
      }
    }

    await logActivity(
      req.userId,
      'PROJECT_CREATED_ZIP',
      `Uploaded project "${createdProject.name}" via ZIP archive (${analysis.detectedType})`,
      { projectId: createdProject.id, detectedType: analysis.detectedType },
      createdProject.id
    );

    res.status(201).json({
      success: true,
      message: 'Project uploaded and analyzed successfully',
      project: createdProject,
      analysis,
    });
  } catch (err) {
    next(err);
  } finally {
    // Always clean up staging upload archive
    if (fs.existsSync(uploadedZipPath)) {
      try {
        fs.unlinkSync(uploadedZipPath);
      } catch (uErr) {
        logger.warn(`Could not unlink uploaded zip staging file: ${uErr.message}`);
      }
    }
  }
};

/**
 * POST /api/projects/select-repository
 * Selects a GitHub repository to track as a Pipeline One Project
 */
export const selectRepository = async (req, res, next) => {
  try {
    const validatedData = selectRepoSchema.parse(req.body);
    const { owner, name, fullName, defaultBranch, selectedBranch, cloneUrl, isPrivate, description } = validatedData;

    // Fetch user GitHub token to perform live repository inspection
    const tokenRes = await db.query(
      'SELECT access_token_enc FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [req.userId, 'github']
    );

    let analysis = {
      detectedType: 'Static HTML/CSS/JS',
      framework: 'HTML5 / Vanilla',
      buildCommand: null,
      outputDirectory: '.',
      requiresBuild: false,
    };
    let latestCommit = null;

    if (tokenRes.rows.length > 0) {
      try {
        const decryptedToken = decrypt(tokenRes.rows[0].access_token_enc);
        const details = await githubService.getRepositoryDetails(decryptedToken, owner, name);
        if (details.analysis) {
          analysis = details.analysis;
        }
        latestCommit = details.latestCommit;
      } catch (err) {
        logger.warn(`Could not fetch GitHub repo details during selection for ${fullName}: ${err.message}`);
      }
    }

    const uniqueSlug = `${generateSlug(name)}-${Date.now().toString().slice(-4)}`;

    // 1. Insert Project in PostgreSQL
    const insertProjectSql = `
      INSERT INTO projects (
        user_id, name, slug, description, source_type, project_type, framework,
        build_command, output_directory, status, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const projectResult = await db.query(insertProjectSql, [
      req.userId,
      name,
      uniqueSlug,
      description || `Imported GitHub repository (${fullName})`,
      'github',
      analysis.detectedType,
      analysis.framework,
      analysis.buildCommand,
      analysis.outputDirectory,
      'ready',
      JSON.stringify({ analysis }),
    ]);

    const createdProject = projectResult.rows[0];

    // 2. Insert Project Repository details
    const insertRepoSql = `
      INSERT INTO project_repositories (
        project_id, repo_id, owner, name, full_name, default_branch,
        selected_branch, clone_url, is_private, last_commit_sha, last_commit_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const repoResult = await db.query(insertRepoSql, [
      createdProject.id,
      validatedData.repoId ? parseInt(validatedData.repoId, 10) : null,
      owner,
      name,
      fullName,
      defaultBranch,
      selectedBranch || defaultBranch,
      cloneUrl || null,
      isPrivate,
      latestCommit?.sha || null,
      latestCommit?.message || null,
    ]);

    // Optional MongoDB scan log if Atlas is connected
    const mongoStatus = getMongoStatus();
    if (mongoStatus.isConnected) {
      try {
        await ProjectScanLog.create({
          projectId: createdProject.id,
          userId: req.userId,
          sourceType: 'github',
          detectedType: analysis.detectedType,
          framework: analysis.framework,
          heuristics: analysis.markers || {},
        });
      } catch (mErr) {
        logger.warn('Failed to save GitHub project scan to MongoDB Atlas:', { error: mErr.message });
      }
    }

    await logActivity(
      req.userId,
      'PROJECT_CREATED_REPO',
      `Connected repository "${fullName}" as project "${createdProject.name}"`,
      { projectId: createdProject.id, repo: fullName, detectedType: analysis.detectedType },
      createdProject.id
    );

    res.status(201).json({
      success: true,
      message: `Repository ${fullName} connected successfully`,
      project: {
        ...createdProject,
        repository: repoResult.rows[0],
        analysis,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getProjects,
  getProjectById,
  deleteProject,
  uploadProjectZip,
  selectRepository,
};
