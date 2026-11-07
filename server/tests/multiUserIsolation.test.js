import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import db, { initDatabase } from '../src/config/db.js';

let serverInstance;
let baseUrl;
let userAToken;
let userAId;
let userBToken;
let userBId;
let projectAId;
let executionAId;

test.before(async () => {
  await initDatabase();
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 1. Register User A
  const emailA = `usera.${Date.now()}@pipelineone.test`;
  const resA = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Alpha',
      email: emailA,
      password: 'SecurePassword123!',
    }),
  });
  const dataA = await resA.json();
  userAToken = dataA.token;
  userAId = dataA.user.id;

  // 2. Register User B
  const emailB = `userb.${Date.now()}@pipelineone.test`;
  const resB = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Beta',
      email: emailB,
      password: 'SecurePassword123!',
    }),
  });
  const dataB = await resB.json();
  userBToken = dataB.token;
  userBId = dataB.user.id;

  // 3. Create Project A owned by User A
  const projRes = await db.query(
    `INSERT INTO projects (user_id, name, slug, description, project_type, source_type, status, output_directory)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [userAId, 'Alpha Secret Project', 'alpha-secret-project', 'Confidential Alpha Code', 'static_html', 'github', 'active', '.']
  );
  projectAId = projRes.rows[0].id;

  // 4. Create Pipeline Configuration for Project A
  await db.query(
    `INSERT INTO pipeline_configurations (project_id, user_id, deployment_environment, build_command, output_directory)
     VALUES ($1, $2, 'production', 'npm run build', 'dist')`,
    [projectAId, userAId]
  );

  // 5. Create Execution for Project A
  const execRes = await db.query(
    `INSERT INTO pipeline_executions (user_id, project_id, branch, commit_sha, commit_message, trigger_source, status, current_stage, duration_seconds)
     VALUES ($1, $2, 'main', 'deadbeef12345678', 'Secret Alpha Commit', 'manual', 'success', 'completed', 15)
     RETURNING id`,
    [userAId, projectAId]
  );
  executionAId = execRes.rows[0].id;

  // Add event log
  await db.query(
    `INSERT INTO pipeline_events (execution_id, stage, message, event_type)
     VALUES ($1, 'build', 'Alpha confidential build log line', 'log')`,
    [executionAId]
  );
});

test.after(async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
});

test('Multi-User Isolation - User B cannot view or list User A projects', async () => {
  // 1. User B lists projects -> should be empty
  const listRes = await fetch(`${baseUrl}/api/projects`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  const listData = await listRes.json();
  assert.equal(listRes.status, 200);
  assert.equal(listData.count, 0);
  assert.equal(listData.projects.length, 0);

  // 2. User B tries to directly fetch Project A
  const getRes = await fetch(`${baseUrl}/api/projects/${projectAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.equal(getRes.status, 404, 'User B must not be able to fetch User A project');

  // 3. User A can fetch their own project
  const getResA = await fetch(`${baseUrl}/api/projects/${projectAId}`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.equal(getResA.status, 200, 'User A should be able to fetch their own project');
});

test('Multi-User Isolation - User B cannot delete User A project', async () => {
  const delRes = await fetch(`${baseUrl}/api/projects/${projectAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.equal(delRes.status, 404, 'User B must receive 404 when trying to delete User A project');

  // Verify Project A still exists in DB
  const checkRes = await db.query('SELECT id FROM projects WHERE id = $1', [projectAId]);
  assert.equal(checkRes.rows.length, 1, 'Project A must still exist');
});

test('Multi-User Isolation - User B cannot view or modify User A pipeline configurations', async () => {
  // Get config
  const getConfRes = await fetch(`${baseUrl}/api/pipelines/config/${projectAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.notEqual(getConfRes.status, 200, 'User B must be rejected when fetching User A pipeline config');

  // Post/save config
  const saveConfRes = await fetch(`${baseUrl}/api/pipelines/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userBToken}`,
    },
    body: JSON.stringify({
      projectId: projectAId,
      buildCommand: 'malicious command',
    }),
  });
  assert.notEqual(saveConfRes.status, 200, 'User B must be rejected when modifying User A pipeline config');
});

test('Multi-User Isolation - User B cannot view User A pipeline executions or logs', async () => {
  // Direct execution details
  const execRes = await fetch(`${baseUrl}/api/pipelines/executions/${executionAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.notEqual(execRes.status, 200, 'User B must not view User A execution details');

  // Monitoring execution details
  const monRes = await fetch(`${baseUrl}/api/monitoring/pipelines/${executionAId}`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.equal(monRes.status, 404, 'User B must be rejected from monitoring User A pipeline');

  // Monitoring logs
  const logsRes = await fetch(`${baseUrl}/api/monitoring/pipelines/${executionAId}/logs`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.equal(logsRes.status, 404, 'User B must not view User A execution logs');
});
