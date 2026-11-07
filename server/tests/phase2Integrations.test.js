import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import db, { initDatabase } from '../src/config/db.js';

let serverInstance;
let baseUrl;
let authToken;
let testUserId;
let testProjectId;

test.before(async () => {
  await initDatabase();
  return new Promise((resolve) => {
    serverInstance = app.listen(0, async () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;

      // Create test user and obtain token
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'DevOps Phase2 Tester',
          email: `phase2.${Date.now()}@pipelineone.test`,
          password: 'PasswordPhase2#2026',
        }),
      });
      const regData = await regRes.json();
      authToken = regData.token;
      testUserId = regData.user.id;

      // Create a test project for builds
      const projRes = await db.query(
        `INSERT INTO projects (user_id, name, slug, source_type, project_type, framework, build_command, output_directory)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [testUserId, 'Phase 2 Static App', `p2-app-${Date.now()}`, 'zip', 'Vite / React', 'React', 'npm run build', 'dist']
      );
      testProjectId = projRes.rows[0].id;

      resolve();
    });
  });
});

test.after(() => {
  if (serverInstance) {
    serverInstance.close();
  }
});

test('Phase 2 API - Docker Engine Availability Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/docker/engine`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.docker !== undefined);
  assert.equal(typeof data.docker.cliInstalled, 'boolean');
});

test('Phase 2 API - Unified Integrations Status (all 4 providers)', async () => {
  const res = await fetch(`${baseUrl}/api/integrations/status`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.integrations.github);
  assert.ok(data.integrations.dockerhub);
  assert.ok(data.integrations.jenkins);
  assert.ok(data.integrations.vercel);

  // Before connecting, all should be connected: false
  assert.equal(data.integrations.dockerhub.connected, false);
  assert.equal(data.integrations.jenkins.connected, false);
  assert.equal(data.integrations.vercel.connected, false);
});

test('Phase 2 API - Docker Hub Connect Input Validation', async () => {
  // Empty username or PAT should return 400
  const res = await fetch(`${baseUrl}/api/integrations/dockerhub/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      username: '',
      personalAccessToken: '',
    }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
});

test('Phase 2 API - Jenkins Connect SSRF Rejection', async () => {
  // SSRF attempt against AWS metadata service
  const res = await fetch(`${baseUrl}/api/integrations/jenkins/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      serverUrl: 'http://169.254.169.254/latest/meta-data/',
      username: 'admin',
      apiToken: 'fakeToken12345',
    }),
  });
  assert.equal(res.status, 500); // Caught by error handler or 400
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.error.includes('prohibited') || data.error.includes('protected') || data.error.includes('security'));
});

test('Phase 2 API - Vercel Token Connect Input Validation', async () => {
  const res = await fetch(`${baseUrl}/api/integrations/vercel/token-connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      token: 'short',
    }),
  });
  assert.equal(res.status, 400);
});

test('Phase 2 API - Docker Build Lifecycle (Trigger, List, Logs, Cancel)', async () => {
  // 1. Trigger build
  const triggerRes = await fetch(`${baseUrl}/api/docker/builds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      projectId: testProjectId,
      imageName: 'my-app-image',
      imageTag: 'v1.0.0',
      publishToDockerHub: false,
    }),
  });
  assert.equal(triggerRes.status, 201);
  const triggerData = await triggerRes.json();
  assert.equal(triggerData.success, true);
  assert.ok(triggerData.build.id);
  assert.equal(triggerData.build.image_name, 'my-app-image');
  assert.equal(triggerData.build.image_tag, 'v1.0.0');

  const buildId = triggerData.build.id;

  // 2. List builds
  const listRes = await fetch(`${baseUrl}/api/docker/builds`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.builds.length >= 1);
  assert.equal(listData.builds[0].id, buildId);

  // 3. Get single build
  const getRes = await fetch(`${baseUrl}/api/docker/builds/${buildId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.build.id, buildId);

  // 4. Get logs
  const logsRes = await fetch(`${baseUrl}/api/docker/builds/${buildId}/logs`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(logsRes.status, 200);
  const logText = await logsRes.text();
  assert.ok(logText.length > 0);

  // 5. Cancel build
  const cancelRes = await fetch(`${baseUrl}/api/docker/builds/${buildId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(cancelRes.status, 200);
  const cancelData = await cancelRes.json();
  assert.equal(cancelData.success, true);
});
