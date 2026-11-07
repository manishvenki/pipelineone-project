import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import db, { initDatabase } from '../src/config/db.js';
import { getDeploymentAnalytics } from '../src/services/analyticsService.js';

let testUserId;
let testProjectId;

test.before(async () => {
  await initDatabase();

  testUserId = crypto.randomUUID();
  await db.query(
    `INSERT INTO users (id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)`,
    [testUserId, `analytics.${Date.now()}@pipelineone.test`, 'hash', 'Analytics Tester']
  );

  testProjectId = crypto.randomUUID();
  await db.query(
    `INSERT INTO projects (id, user_id, name, slug, framework, project_type, source_type, status, output_directory)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [testProjectId, testUserId, 'Analytics Test App', 'analytics-test-app', 'react_vite', 'react_vite', 'github', 'active', 'dist']
  );

  // Seed test executions: 2 success, 1 failed, 1 cancelled
  await db.query(
    `INSERT INTO pipeline_executions (user_id, project_id, branch, status, duration_seconds, deployment_url)
     VALUES 
       ($1, $2, 'main', 'success', 25, 'https://test-app-1.vercel.app'),
       ($1, $2, 'main', 'success', 35, 'https://test-app-2.vercel.app'),
       ($1, $2, 'main', 'failed', 15, null),
       ($1, $2, 'main', 'cancelled', 5, null)`,
    [testUserId, testProjectId]
  );
});

test('Deployment Analytics - Correctly calculates summary and success rate', async () => {
  const analytics = await getDeploymentAnalytics(testUserId, '30d');

  assert.ok(analytics.summary);
  assert.equal(analytics.summary.totalExecutions, 4);
  assert.equal(analytics.summary.successfulExecutions, 2);
  assert.equal(analytics.summary.failedExecutions, 1);
  assert.equal(analytics.summary.cancelledExecutions, 1);

  // Success rate: 2 / (2 + 1) * 100 = 67%
  assert.equal(analytics.summary.successRate, 67);

  // Performance calculations
  assert.equal(analytics.summary.performance.avgDurationSeconds, 30); // (25 + 35) / 2
  assert.equal(analytics.summary.performance.fastestBuildSeconds, 25);
  assert.equal(analytics.summary.performance.slowestBuildSeconds, 35);
  assert.equal(analytics.summary.performance.failureCount, 1);
});

test('Deployment Analytics - Aggregates project activity and daily trends', async () => {
  const analytics = await getDeploymentAnalytics(testUserId, '30d');

  assert.ok(Array.isArray(analytics.dailyTrends));
  assert.ok(analytics.dailyTrends.length >= 1);

  assert.ok(Array.isArray(analytics.projectActivity));
  const proj = analytics.projectActivity.find((p) => p.projectId === testProjectId);
  assert.ok(proj);
  assert.equal(proj.projectName, 'Analytics Test App');
  assert.equal(proj.totalExecutions, 4);
  assert.equal(proj.successfulExecutions, 2);
  assert.equal(proj.failedExecutions, 1);
  assert.equal(proj.successRate, 67);
});
