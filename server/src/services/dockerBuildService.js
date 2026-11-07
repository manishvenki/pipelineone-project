import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';
import db from '../config/db.js';
import { generateDockerfile, generateDockerignore } from './dockerfileGenerator.js';
import { decrypt } from '../utils/security.js';
import { logActivity } from './activityService.js';
import logger from '../utils/logger.js';

export const buildEvents = new EventEmitter();
buildEvents.setMaxListeners(100);

// Active build processes registry (buildId -> { process, abortController })
const activeBuilds = new Map();

const buildLogsDir = path.resolve(process.cwd(), 'storage/build-logs');
if (!fs.existsSync(buildLogsDir)) {
  fs.mkdirSync(buildLogsDir, { recursive: true });
}

/**
 * Checks if Docker CLI is installed and the Docker daemon is responding
 */
export const checkDockerAvailability = async () => {
  return new Promise((resolve) => {
    const child = spawn('docker', ['info', '--format', '{{.ServerVersion}}'], {
      windowsHide: true,
      timeout: 4000,
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (d) => {
      output += d.toString();
    });

    child.stderr.on('data', (d) => {
      errorOutput += d.toString();
    });

    child.on('error', (err) => {
      resolve({
        available: false,
        cliInstalled: false,
        daemonRunning: false,
        error: `Docker executable not found in PATH: ${err.message}`,
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          available: true,
          cliInstalled: true,
          daemonRunning: true,
          serverVersion: output.trim() || 'Active',
        });
      } else {
        resolve({
          available: false,
          cliInstalled: true,
          daemonRunning: false,
          error: errorOutput.trim() || 'Docker daemon is not running (check Docker Desktop status)',
        });
      }
    });
  });
};

/**
 * Creates a new build record in the database
 */
export const createBuildRecord = async ({ userId, projectId, imageName, imageTag }) => {
  const insertSql = `
    INSERT INTO docker_builds (
      user_id, project_id, status, image_name, image_tag, started_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `;
  const result = await db.query(insertSql, [
    userId,
    projectId,
    'queued',
    imageName.toLowerCase().trim(),
    imageTag.trim() || 'latest',
  ]);
  return result.rows[0];
};

/**
 * Initiates Docker image build execution
 */
export const startDockerBuild = async ({
  buildId,
  userId,
  project,
  imageName,
  imageTag = 'latest',
  publishToDockerHub = false,
  dockerHubRepo = null,
}) => {
  const startTime = Date.now();
  const logFilePath = path.join(buildLogsDir, `${buildId}.log`);
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  const appendLog = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    logStream.write(line);
    buildEvents.emit(`log:${buildId}`, line);
  };

  const updateBuildStatus = async (status, extra = {}) => {
    const { exitCode = null, errorSummary = null } = extra;
    const completedAt = ['completed', 'failed', 'cancelled'].includes(status) ? new Date().toISOString() : null;
    const durationMs = completedAt ? Date.now() - startTime : null;

    if (completedAt) {
      await db.query(
        `UPDATE docker_builds
         SET status = $1, completed_at = $2, duration_ms = $3, exit_code = $4, error_summary = $5, updated_at = NOW()
         WHERE id = $6`,
        [status, completedAt, durationMs, exitCode, errorSummary, buildId]
      );
    } else {
      await db.query(
        `UPDATE docker_builds
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, buildId]
      );
    }

    buildEvents.emit(`status:${buildId}`, {
      buildId,
      status,
      completedAt,
      durationMs,
      exitCode,
      errorSummary,
    });
  };

  try {
    appendLog(`=== Pipeline One Docker Containerization Engine ===`);
    appendLog(`Build ID: ${buildId}`);
    appendLog(`Project: ${project.name} (${project.project_type})`);
    appendLog(`Target Image: ${imageName}:${imageTag}`);
    await updateBuildStatus('preparing');

    // 1. Verify Docker Engine Availability
    const dockerStatus = await checkDockerAvailability();
    if (!dockerStatus.daemonRunning) {
      const errMsg = dockerStatus.error || 'Docker daemon is not running';
      appendLog(`[ERROR] Docker Engine unavailable: ${errMsg}`);
      appendLog(`[HINT] Please ensure Docker Desktop is started and the Docker daemon is accessible.`);
      await updateBuildStatus('failed', {
        exitCode: 1,
        errorSummary: `Docker Engine unavailable: ${errMsg}`,
      });
      logStream.end();
      return;
    }

    appendLog(`Docker Engine verified: Version ${dockerStatus.serverVersion}`);

    // 2. Determine Build Context Directory
    let contextDir = project.storage_path;

    // If GitHub project without existing local storage, prepare temporary context
    if (!contextDir || !fs.existsSync(contextDir)) {
      contextDir = path.resolve(process.cwd(), `storage/contexts/${project.id}`);
      fs.mkdirSync(contextDir, { recursive: true });

      // Create fallback static index if empty
      const indexPath = path.join(contextDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        fs.writeFileSync(
          indexPath,
          `<!DOCTYPE html><html><head><title>${project.name}</title></head><body><h1>${project.name}</h1><p>Built with Pipeline One Docker Engine.</p></body></html>`
        );
      }
    }

    // 3. Generate Dockerfile and .dockerignore
    const analysis = project.metadata?.analysis || {
      detectedType: project.project_type,
      framework: project.framework,
      buildCommand: project.build_command,
      outputDirectory: project.output_directory,
      requiresBuild: Boolean(project.build_command),
    };

    const { dockerfile } = generateDockerfile(analysis);
    const dockerfilePath = path.join(contextDir, 'Dockerfile');
    const dockerignorePath = path.join(contextDir, '.dockerignore');

    fs.writeFileSync(dockerfilePath, dockerfile, 'utf8');
    fs.writeFileSync(dockerignorePath, generateDockerignore(), 'utf8');

    appendLog(`Generated multi-stage Dockerfile successfully.`);
    await updateBuildStatus('building');

    // 4. Execute `docker build` using safe argument arrays
    const fullTag = `${imageName}:${imageTag}`;
    const buildArgs = [
      'build',
      '-t',
      fullTag,
      '-f',
      dockerfilePath,
      contextDir,
    ];

    appendLog(`Executing: docker build -t ${fullTag} ...`);

    const child = spawn('docker', buildArgs, {
      windowsHide: true,
      cwd: contextDir,
    });

    activeBuilds.set(buildId, child);

    child.stdout.on('data', (chunk) => {
      appendLog(chunk.toString().trimEnd());
    });

    child.stderr.on('data', (chunk) => {
      appendLog(`[docker] ${chunk.toString().trimEnd()}`);
    });

    const buildExitCode = await new Promise((resolve) => {
      child.on('close', (code) => {
        activeBuilds.delete(buildId);
        resolve(code);
      });
      child.on('error', (err) => {
        appendLog(`[ERROR] Subprocess error: ${err.message}`);
        activeBuilds.delete(buildId);
        resolve(1);
      });
    });

    if (buildExitCode !== 0) {
      appendLog(`[FAILED] Docker build exited with non-zero code ${buildExitCode}`);
      await updateBuildStatus('failed', {
        exitCode: buildExitCode,
        errorSummary: `Docker build command failed with exit code ${buildExitCode}`,
      });
      logStream.end();
      return;
    }

    appendLog(`[SUCCESS] Docker image ${fullTag} built successfully.`);
    await updateBuildStatus('built');

    // 5. Publish to Docker Hub if requested
    if (publishToDockerHub && dockerHubRepo) {
      await updateBuildStatus('publishing');
      appendLog(`Starting publishing workflow to Docker Hub: ${dockerHubRepo}:${imageTag}...`);

      const pubResult = await publishImageToDockerHub({
        userId,
        buildId,
        localTag: fullTag,
        remoteRepo: dockerHubRepo,
        tag: imageTag,
        appendLog,
      });

      if (!pubResult.success) {
        await updateBuildStatus('failed', {
          exitCode: 1,
          errorSummary: pubResult.error,
        });
        logStream.end();
        return;
      }
    }

    await updateBuildStatus('completed', { exitCode: 0 });
    appendLog(`[FINISHED] Build process completed successfully.`);
    logStream.end();

    await logActivity(
      userId,
      'DOCKER_BUILD_COMPLETED',
      `Built Docker image "${fullTag}" for project "${project.name}"`,
      { buildId, imageName, imageTag },
      project.id
    );
  } catch (err) {
    appendLog(`[FATAL] Unexpected build execution error: ${err.message}`);
    await updateBuildStatus('failed', {
      exitCode: 1,
      errorSummary: err.message,
    });
    logStream.end();
  }
};

/**
 * Publishes a built Docker image to Docker Hub securely
 */
const publishImageToDockerHub = async ({ userId, buildId, localTag, remoteRepo, tag, appendLog }) => {
  try {
    // 1. Fetch user's Docker Hub token from connected_integrations
    const intRes = await db.query(
      'SELECT access_token_enc, provider_username FROM connected_integrations WHERE user_id = $1 AND provider = $2',
      [userId, 'dockerhub']
    );

    if (intRes.rows.length === 0) {
      appendLog('[ERROR] Docker Hub integration not connected. Cannot publish image.');
      return { success: false, error: 'Docker Hub account not connected' };
    }

    const { access_token_enc, provider_username } = intRes.rows[0];
    const pat = decrypt(access_token_enc);

    // 2. Tag image with remote repository name
    const remoteTag = remoteRepo.includes('/') ? `${remoteRepo}:${tag}` : `${provider_username}/${remoteRepo}:${tag}`;
    appendLog(`Tagging image as ${remoteTag}...`);

    await runCommandArray('docker', ['tag', localTag, remoteTag], appendLog);

    // 3. Authenticate to Docker Hub via stdin (secure, no token in args/logs)
    appendLog(`Authenticating to Docker Hub as @${provider_username}...`);
    const loginChild = spawn('docker', ['login', '-u', provider_username, '--password-stdin'], {
      windowsHide: true,
    });

    let loginError = '';
    loginChild.stderr.on('data', (d) => {
      loginError += d.toString();
    });

    loginChild.stdin.write(pat);
    loginChild.stdin.end();

    const loginCode = await new Promise((res) => loginChild.on('close', res));
    if (loginCode !== 0) {
      appendLog(`[ERROR] Docker Hub login failed: ${loginError.trim()}`);
      return { success: false, error: 'Docker Hub authentication failed' };
    }

    appendLog(`Docker Hub authentication verified.`);

    // 4. Push image
    appendLog(`Pushing ${remoteTag} to Docker Hub registry...`);
    let pushOutput = '';
    const pushCode = await runCommandArray('docker', ['push', remoteTag], (chunk) => {
      pushOutput += chunk;
      appendLog(chunk);
    });

    // 5. Clean up credentials session
    spawn('docker', ['logout'], { windowsHide: true });

    if (pushCode !== 0) {
      appendLog(`[ERROR] Docker push exited with code ${pushCode}`);
      return { success: false, error: 'Docker push command failed' };
    }

    // Extract digest from output if present
    const digestMatch = pushOutput.match(/digest:\s+(sha256:[a-f0-9]+)/i);
    const digest = digestMatch ? digestMatch[1] : null;

    appendLog(`[SUCCESS] Image pushed successfully! Digest: ${digest || 'Confirmed'}`);

    // Persist to docker_images table
    await db.query(
      `INSERT INTO docker_images (
        docker_build_id, user_id, registry, repository, tag, digest, pushed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [buildId, userId, 'docker.io', remoteRepo, tag, digest]
    );

    return { success: true, digest, remoteTag };
  } catch (err) {
    appendLog(`[ERROR] Docker Hub publishing exception: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * Runs a command with argument arrays safely
 */
const runCommandArray = (cmd, args, onData) => {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { windowsHide: true });
    child.stdout.on('data', (d) => onData && onData(d.toString().trimEnd()));
    child.stderr.on('data', (d) => onData && onData(d.toString().trimEnd()));
    child.on('close', resolve);
    child.on('error', () => resolve(1));
  });
};

/**
 * Cancels an active build
 */
export const cancelBuild = async (buildId, userId) => {
  const child = activeBuilds.get(buildId);
  if (child) {
    child.kill('SIGTERM');
    activeBuilds.delete(buildId);
  }

  await db.query(
    `UPDATE docker_builds
     SET status = 'cancelled', completed_at = NOW(), error_summary = 'Build cancelled by user', updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [buildId, userId]
  );

  buildEvents.emit(`status:${buildId}`, {
    buildId,
    status: 'cancelled',
    errorSummary: 'Build cancelled by user',
  });

  return { success: true, message: 'Build cancelled successfully' };
};

/**
 * Reads logs for a build
 */
export const getBuildLogs = (buildId) => {
  const logFilePath = path.join(buildLogsDir, `${buildId}.log`);
  if (!fs.existsSync(logFilePath)) {
    return 'No logs generated yet.\n';
  }
  return fs.readFileSync(logFilePath, 'utf8');
};

export default {
  checkDockerAvailability,
  createBuildRecord,
  startDockerBuild,
  cancelBuild,
  getBuildLogs,
  buildEvents,
};

