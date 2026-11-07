import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import db, { initDatabase } from '../src/config/db.js';

let serverInstance;
let baseUrl;
let authToken;
let testUserId;
let testProjectId;
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

  // 1. Create a user
  const email = `phase4.${Date.now()}@pipelineone.test`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Phase 4 Monitoring Tester',
      email,
      password: 'SecurePassword123!',
    }),
  });
  const regData = await regRes.json();
  authToken = regData.token;
  testUserId = regData.user.id;

  // 2. Create project
  const projRes = await db.query(
    `INSERT INTO projects (user_id, name, slug, description, project_type, source_type, status, output_directory)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [testUserId, 'Phase 4 Monitoring App', 'phase4-monitoring-app', 'Static site', 'static_html', 'github', 'active', '.']
  );
  testProjectId = projRes.rows[0].id;

  // 3. Create active and completed executions
  const execRes = await db.query(
    `INSERT INTO pipeline_executions (user_id, project_id, branch, commit_sha, commit_message, trigger_source, status, current_stage, duration_seconds, deployment_url)
     VALUES ($1, $2, 'main', 'abcdef1234567890', 'Test commit for Phase 4', 'manual', 'success', 'completed', 28, 'https://phase4-app.vercel.app')
     RETURNING id`,
    [testUserId, testProjectId]
  );
  testExecutionId = execRes.rows[0].id;

  // Add a log event containing a secret to verify redaction
  await db.query(
    `INSERT INTO pipeline_events (execution_id, stage, message, event_type)
     VALUES ($1, $2, $3, $4)`,
    [testExecutionId, 'build', 'Deploying with token: ghp_111122223333444455556666777788889999', 'log']
  );
});

test.after(() => {
  if (serverInstance) {
    serverInstance.close();
  }
});

test('Phase 4 API - Dashboard Overview Metrics Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/dashboard/overview`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.ok(data.totalProjects >= 1);
  assert.ok(data.totalExecutions >= 1);
  assert.ok(data.successfulExecutions >= 1);
  assert.ok(typeof data.successRate === 'number');
});

test('Phase 4 API - Active Pipelines and Recent Executions', async () => {
  // Recent executions
  const recentRes = await fetch(`${baseUrl}/api/dashboard/recent-executions`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  assert.equal(recentRes.status, 200);
  const recentData = await recentRes.json();
  assert.equal(recentData.success, true);
  assert.ok(Array.isArray(recentData.executions));
  assert.ok(recentData.executions.length >= 1);
  assert.equal(recentData.executions[0].id, testExecutionId);

  // Active pipelines
  const activeRes = await fetch(`${baseUrl}/api/dashboard/active-pipelines`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  assert.equal(activeRes.status, 200);
  const activeData = await activeRes.json();
  assert.equal(activeData.success, true);
  assert.ok(Array.isArray(activeData.pipelines));
});

test('Phase 4 API - Pipeline Details & 10 Canonical Stages', async () => {
  const res = await fetch(`${baseUrl}/api/monitoring/pipelines/${testExecutionId}/stages`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.stages));
  assert.equal(data.stages.length, 10);

  // Verify canonical stages exist
  const stageKeys = data.stages.map((s) => s.key);
  assert.ok(stageKeys.includes('github_source'));
  assert.ok(stageKeys.includes('jenkins_queue'));
  assert.ok(stageKeys.includes('source_checkout'));
  assert.ok(stageKeys.includes('installing_dependencies'));
  assert.ok(stageKeys.includes('build'));
  assert.ok(stageKeys.includes('static_output_validation'));
  assert.ok(stageKeys.includes('docker_build'));
  assert.ok(stageKeys.includes('docker_hub_publish'));
  assert.ok(stageKeys.includes('vercel_deployment'));
  assert.ok(stageKeys.includes('deployment_verification'));
});

test('Phase 4 API - Pipeline Logs with Server-Side Secret Redaction', async () => {
  const res = await fetch(`${baseUrl}/api/monitoring/pipelines/${testExecutionId}/logs`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.logs));
  assert.ok(data.logs.length >= 1);

  // Assert secret is sanitized
  const secretLog = data.logs.find((l) => l.message.includes('Deploying with token'));
  assert.ok(secretLog);
  assert.ok(!secretLog.message.includes('ghp_111122223333444455556666777788889999'));
  assert.ok(secretLog.message.includes('[REDACTED_SECRET]'));
});

test('Phase 4 API - Analytics Overview & Notification APIs', async () => {
  // Analytics overview
  const analyticsRes = await fetch(`${baseUrl}/api/analytics/overview`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  assert.equal(analyticsRes.status, 200);
  const analyticsData = await analyticsRes.json();
  assert.equal(analyticsData.success, true);
  assert.ok(analyticsData.summary);

  // Notifications list
  const notifRes = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  assert.equal(notifRes.status, 200);
  const notifData = await notifRes.json();
  assert.equal(notifData.success, true);
  assert.ok(Array.isArray(notifData.notifications));
});
