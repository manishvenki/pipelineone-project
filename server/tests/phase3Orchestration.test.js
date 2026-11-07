import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import app from '../src/app.js';
import db, { initDatabase } from '../src/config/db.js';

let serverInstance;
let baseUrl;
let authToken;
let testUserId;
let testProjectId;

test.before(async () => {
  await initDatabase();
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 1. Create a user
  const email = `phase3.${Date.now()}@pipelineone.test`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'DevOps Architect',
      email,
      password: 'SecurePassword123!',
    }),
  });
  const regData = await regRes.json();
  authToken = regData.token;
  testUserId = regData.user.id;

  // 2. Create a test project directly in database
  const projRes = await db.query(
    `INSERT INTO projects (user_id, name, slug, description, project_type, source_type, status, output_directory)
     VALUES ($1, $2, $3, $4, $5, $6, 'ready', 'dist')
     RETURNING id`,
    [testUserId, 'Orchestration Project', `orch-${Date.now()}`, 'CI/CD Test Project', 'react_vite', 'github']
  );
  testProjectId = projRes.rows[0].id;
});

test.after(() => {
  if (serverInstance) {
    serverInstance.close();
  }
});

test('Phase 3 API - Pipeline Configuration Defaults & Upsert', async () => {
  // 1. Get default configuration for unconfigured project
  const defRes = await fetch(`${baseUrl}/api/pipelines/configurations/project/${testProjectId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(defRes.status, 200);
  const defData = await defRes.json();
  assert.equal(defData.success, true);
  assert.equal(defData.configured, false);
  assert.ok(defData.config.webhook_secret);
  assert.equal(defData.config.github_branch, 'main');

  // 2. Upsert custom configuration
  const saveRes = await fetch(`${baseUrl}/api/pipelines/configurations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: testProjectId,
      github_branch: 'production',
      build_command: 'npm run build',
      install_command: 'npm ci',
      output_directory: 'dist',
      docker_enabled: true,
      docker_repository: 'myuser/app',
      docker_tag: 'v1.0.0',
      auto_deploy_enabled: true,
      deployment_environment: 'production',
    }),
  });

  assert.equal(saveRes.status, 200);
  const saveData = await saveRes.json();
  assert.equal(saveData.success, true);
  assert.equal(saveData.config.github_branch, 'production');
  assert.equal(saveData.config.docker_enabled, true);
  assert.equal(saveData.config.docker_repository, 'myuser/app');
});

test('Phase 3 API - Pipeline Manual Trigger & Execution Query', async () => {
  // 1. Trigger manual run
  const runRes = await fetch(`${baseUrl}/api/pipelines/${testProjectId}/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      branch: 'production',
      triggerSource: 'manual',
    }),
  });

  assert.equal(runRes.status, 201);
  const runData = await runRes.json();
  assert.equal(runData.success, true);
  assert.ok(runData.execution);
  assert.equal(runData.execution.branch, 'production');
  assert.equal(runData.execution.trigger_source, 'manual');

  const execId = runData.execution.id;

  // 2. List executions
  const listRes = await fetch(`${baseUrl}/api/pipelines/executions?projectId=${testProjectId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.executions.length > 0);
  assert.equal(listData.executions[0].id, execId);

  // 3. Inspect single execution details and event timeline
  const detailRes = await fetch(`${baseUrl}/api/pipelines/executions/${execId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(detailRes.status, 200);
  const detailData = await detailRes.json();
  assert.equal(detailData.execution.id, execId);
  assert.ok(Array.isArray(detailData.events));
  assert.ok(detailData.events.length > 0); // At least initial created event
});

test('Phase 3 API - Pipeline Cancellation & Safe Retry Lifecycle', async () => {
  // 1. Trigger a fresh run
  const runRes = await fetch(`${baseUrl}/api/pipelines/${testProjectId}/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branch: 'production' }),
  });
  const runData = await runRes.json();
  const execId = runData.execution.id;

  // 2. Cancel run
  const cancelRes = await fetch(`${baseUrl}/api/pipelines/executions/${execId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(cancelRes.status, 200);

  // 3. Verify status transitioned to cancelled
  const detailRes = await fetch(`${baseUrl}/api/pipelines/executions/${execId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const detailData = await detailRes.json();
  assert.equal(detailData.execution.status, 'cancelled');

  // 4. Retry the cancelled run
  const retryRes = await fetch(`${baseUrl}/api/pipelines/executions/${execId}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(retryRes.status, 201);
  const retryData = await retryRes.json();
  assert.equal(retryData.success, true);
  assert.notEqual(retryData.execution.id, execId); // Fresh traceable attempt
  assert.equal(retryData.execution.trigger_source, 'retry');
});

test('Phase 3 API - GitHub Webhook Ping & Idempotency Guard', async () => {
  const deliveryId = `deliv-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Get project webhook secret
  const confRes = await fetch(`${baseUrl}/api/pipelines/configurations/project/${testProjectId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const confData = await confRes.json();
  const secret = confData.config.webhook_secret;

  const pingPayload = JSON.stringify({
    repository: { full_name: 'Orchestration Project' },
    zen: 'Responsive is better than fast.',
  });

  const hmac = crypto.createHmac('sha256', secret).update(pingPayload).digest('hex');
  const signatureHeader = `sha256=${hmac}`;

  // 1. Send Ping event with verified signature
  const pingRes = await fetch(`${baseUrl}/api/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'ping',
      'X-GitHub-Delivery': deliveryId,
      'X-Hub-Signature-256': signatureHeader,
    },
    body: pingPayload,
  });

  assert.equal(pingRes.status, 200);
  const pingData = await pingRes.json();
  assert.equal(pingData.success, true);
  assert.equal(pingData.event, 'ping');

  // 2. Duplicate delivery should be recognized as duplicate
  const dupRes = await fetch(`${baseUrl}/api/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'ping',
      'X-GitHub-Delivery': deliveryId,
      'X-Hub-Signature-256': signatureHeader,
    },
    body: pingPayload,
  });

  assert.equal(dupRes.status, 200);
  const dupData = await dupRes.json();
  assert.equal(dupData.duplicate, true);
});
