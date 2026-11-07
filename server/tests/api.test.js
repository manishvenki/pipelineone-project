import test from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import os from 'os';
import app from '../src/app.js';
import { initDatabase } from '../src/config/db.js';

let serverInstance;
let baseUrl;

test.before(async () => {
  await initDatabase();
  return new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  if (serverInstance) {
    serverInstance.close();
  }
});

test('API - Health Check Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.status, 'operational');
  assert.ok(data.databases);
  assert.ok(data.databases.postgresql);
});

test('API - User Registration & Authentication Flow', async () => {
  const userPayload = {
    name: 'Alice DevOps',
    email: `alice.${Date.now()}@pipelineone.test`,
    password: 'SecurePassword123!',
  };

  // 1. Register
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userPayload),
  });

  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  assert.equal(regData.success, true);
  assert.equal(regData.user.name, userPayload.name);
  assert.equal(regData.user.email, userPayload.email);
  assert.ok(regData.token);

  const token = regData.token;

  // 2. Duplicate registration should be rejected with 409
  const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userPayload),
  });
  assert.equal(dupRes.status, 409);

  // 3. Login
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userPayload.email,
      password: userPayload.password,
    }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.equal(loginData.success, true);
  assert.ok(loginData.token);

  // 4. Invalid password should return 401
  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userPayload.email,
      password: 'WrongPassword',
    }),
  });
  assert.equal(badLogin.status, 401);

  // 5. Protected /api/auth/me
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.user.email, userPayload.email);
  assert.equal(meData.user.settings.theme, 'dark');

  // 6. GitHub Integration Status check
  const ghStatusRes = await fetch(`${baseUrl}/api/integrations/github/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(ghStatusRes.status, 200);
  const ghStatus = await ghStatusRes.json();
  assert.equal(ghStatus.success, true);
  assert.equal(ghStatus.connected, false);

  // 7. Select Repository flow (persisted in PostgreSQL)
  const selectRepoRes = await fetch(`${baseUrl}/api/projects/select-repository`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world',
      defaultBranch: 'main',
      selectedBranch: 'main',
      isPrivate: false,
      description: 'My first Pipeline One repo project',
    }),
  });
  assert.equal(selectRepoRes.status, 201);
  const selectedProj = await selectRepoRes.json();
  assert.equal(selectedProj.success, true);
  assert.equal(selectedProj.project.name, 'hello-world');
  assert.equal(selectedProj.project.source_type, 'github');
  assert.ok(selectedProj.project.repository);

  // 8. Fetch projects list
  const listRes = await fetch(`${baseUrl}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.count, 1);
  assert.equal(listData.projects[0].name, 'hello-world');

  // 9. Fetch user activity
  const actRes = await fetch(`${baseUrl}/api/auth/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(actRes.status, 200);
  const actData = await actRes.json();
  assert.ok(actData.activities.length >= 2); // registration + project selection

  // 10. Delete project
  const delRes = await fetch(`${baseUrl}/api/projects/${selectedProj.project.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(delRes.status, 200);
});

