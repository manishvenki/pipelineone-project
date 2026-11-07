import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import app from '../src/app.js';
import db, { initDatabase } from '../src/config/db.js';

let serverInstance;
let baseUrl;
let authToken;
let testUser;
let testProject;
let testExecutionId;

test.before(async () => {
  await initDatabase();
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

// ==========================================
// Test A: Authentication & User Lifecycle
// ==========================================
test('E2E Lifecycle - Test A: New user registration, login, and session auth', async () => {
  const email = `e2e.user.${Date.now()}@pipelineone.test`;
  const password = 'StrongPassword999!';

  // 1. Register
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E Automation Engineer',
      email,
      password,
    }),
  });
  const regData = await regRes.json();
  assert.equal(regRes.status, 201);
  assert.ok(regData.token, 'Should return JWT token');
  assert.equal(regData.user.email, email);

  // 2. Login
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json();
  assert.equal(loginRes.status, 200);
  assert.ok(loginData.token);

  authToken = loginData.token;
  testUser = loginData.user;

  // 3. Authenticated profile check
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const meData = await meRes.json();
  assert.equal(meRes.status, 200);
  assert.equal(meData.user.id, testUser.id);
});

// ==========================================
// Test B: Project Creation & Persistence
// ==========================================
test('E2E Lifecycle - Test B: Project creation, metadata heuristics, and persistence', async () => {
  // Insert project
  const projRes = await db.query(
    `INSERT INTO projects (user_id, name, slug, description, project_type, source_type, status, output_directory, build_command)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      testUser.id,
      'E2E Static Portfolio',
      'e2e-static-portfolio',
      'Static website for testing',
      'React + Vite',
      'github',
      'ready',
      'dist',
      'npm run build',
    ]
  );
  testProject = projRes.rows[0];
  assert.ok(testProject.id);

  // Read via API
  const apiRes = await fetch(`${baseUrl}/api/projects/${testProject.id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const apiData = await apiRes.json();
  assert.equal(apiRes.status, 200);
  assert.equal(apiData.project.name, 'E2E Static Portfolio');
});

// ==========================================
// Test C & D: Pipeline Configuration & Integrations
// ==========================================
test('E2E Lifecycle - Test C & D: Pipeline configuration save and integration metadata', async () => {
  const configPayload = {
    projectId: testProject.id,
    deploymentEnvironment: 'production',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    nodeVersion: '20.x',
    dockerEnabled: true,
    dockerPublishEnabled: false,
    autoDeployBranch: 'main',
    webhookEnabled: true,
  };

  const saveRes = await fetch(`${baseUrl}/api/pipelines/config/${testProject.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(configPayload),
  });
  const saveData = await saveRes.json();
  assert.equal(saveRes.status, 200);
  assert.equal(saveData.config.build_command, 'npm run build');

  // Verify retrieval
  const getRes = await fetch(`${baseUrl}/api/pipelines/config/${testProject.id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const getData = await getRes.json();
  assert.equal(getRes.status, 200);
  assert.equal(getData.config.output_directory, 'dist');
});

// ==========================================
// Test E: Complete CI/CD Pipeline Orchestration & 10-Stage Telemetry
// ==========================================
test('E2E Lifecycle - Test E: Pipeline execution dispatch, stage events, and monitoring telemetry', async () => {
  // 1. Trigger run
  const triggerRes = await fetch(`${baseUrl}/api/pipelines/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      projectId: testProject.id,
      branch: 'main',
      commitSha: '9f8e7d6c5b4a3210',
      commitMessage: 'E2E automated validation commit',
      commitAuthor: 'DevOps Agent',
    }),
  });
  const triggerData = await triggerRes.json();
  assert.equal(triggerRes.status, 201);
  assert.ok(triggerData.execution.id);
  testExecutionId = triggerData.execution.id;

  // 2. Fetch monitoring details
  const detailsRes = await fetch(`${baseUrl}/api/monitoring/pipelines/${testExecutionId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const detailsData = await detailsRes.json();
  assert.equal(detailsRes.status, 200);
  assert.equal(detailsData.execution.project_id, testProject.id);

  // 3. Fetch 10-stage events
  const stagesRes = await fetch(`${baseUrl}/api/monitoring/pipelines/${testExecutionId}/stages`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const stagesData = await stagesRes.json();
  assert.equal(stagesRes.status, 200);
  assert.equal(stagesData.stages.length, 10, 'Must reconcile all 10 canonical stages');
  assert.equal(stagesData.stages[0].key, 'github_source');
  assert.equal(stagesData.stages[9].key, 'deployment_verification');
});

// ==========================================
// Test F: Webhook Automation & Idempotency
// ==========================================
test('E2E Lifecycle - Test F: GitHub Webhook HMAC verification and duplicate rejection', async () => {
  // Link repository to project
  await db.query(
    `INSERT INTO project_repositories (project_id, owner, name, full_name, default_branch, selected_branch)
     VALUES ($1, 'e2e-org', 'e2e-repo', 'e2e-org/e2e-repo', 'main', 'main')
     ON CONFLICT DO NOTHING`,
    [testProject.id]
  );

  // Fetch the project-specific webhook secret
  const confRes = await db.query(
    'SELECT webhook_secret FROM pipeline_configurations WHERE project_id = $1',
    [testProject.id]
  );
  const secret = confRes.rows[0]?.webhook_secret || process.env.GITHUB_WEBHOOK_SECRET || 'test_webhook_secret';
  const deliveryId = `e2e-delivery-${Date.now()}`;
  const payload = JSON.stringify({
    ref: 'refs/heads/main',
    after: '11223344556677889900',
    repository: { full_name: 'e2e-org/e2e-repo' },
    head_commit: {
      id: '11223344556677889900',
      message: 'Automated webhook push test',
      author: { name: 'E2E Agent' },
    },
  });

  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // First delivery
  const res1 = await fetch(`${baseUrl}/api/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Delivery': deliveryId,
      'X-Hub-Signature-256': signature,
      'X-GitHub-Event': 'ping',
    },
    body: payload,
  });
  assert.ok([200, 202].includes(res1.status), 'First webhook delivery should be accepted');

  // Duplicate delivery with identical deliveryId
  const res2 = await fetch(`${baseUrl}/api/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Delivery': deliveryId,
      'X-Hub-Signature-256': signature,
      'X-GitHub-Event': 'ping',
    },
    body: payload,
  });
  const data2 = await res2.json();
  assert.ok(res2.status >= 200 && res2.status < 500);
  assert.equal(data2.duplicate, true, 'Duplicate webhook event must be identified');
});

// ==========================================
// Test G: Failure Recovery & Notifications
// ==========================================
test('E2E Lifecycle - Test G: Pipeline cancellation, safe retrying, and in-app notifications', async () => {
  // 1. Cancel execution
  const cancelRes = await fetch(`${baseUrl}/api/pipelines/executions/${testExecutionId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(cancelRes.status, 200);

  // 2. Verify in-app notifications generated
  const notifRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const notifData = await notifRes.json();
  assert.equal(notifRes.status, 200);
  assert.ok(Array.isArray(notifData.notifications));
  assert.ok(notifData.notifications.length > 0, 'Notifications must be logged for user events');

  // 3. Mark notification as read
  const notifId = notifData.notifications[0].id;
  const readRes = await fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(readRes.status, 200);

  // 4. Retry execution safely
  const retryRes = await fetch(`${baseUrl}/api/pipelines/executions/${testExecutionId}/retry`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const retryData = await retryRes.json();
  assert.equal(retryRes.status, 201);
  assert.ok(retryData.execution.id);
  assert.notEqual(retryData.execution.id, testExecutionId, 'Retry must generate a fresh execution ID');
});
