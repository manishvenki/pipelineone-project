import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeLogText } from '../src/services/logStreamingService.js';

test('Secret Redaction - Redacts GitHub Personal Access Tokens (classic)', () => {
  const rawLog = 'git clone https://ghp_123456789012345678901234567890123456@github.com/org/repo.git';
  const clean = sanitizeLogText(rawLog);
  assert.ok(!clean.includes('ghp_123456789012345678901234567890123456'));
  assert.ok(clean.includes('[REDACTED_SECRET]'));
});

test('Secret Redaction - Redacts GitHub fine-grained PAT', () => {
  const fakePat = 'github_pat_11AAAAAAA0123456789012345678901234567890123456789012345678901234567890123456789012';
  const rawLog = `Using auth token: ${fakePat}`;
  const clean = sanitizeLogText(rawLog);
  assert.ok(!clean.includes(fakePat));
  assert.ok(clean.includes('[REDACTED_SECRET]'));
});

test('Secret Redaction - Redacts Vercel Access Tokens', () => {
  const rawLog = 'curl -H "Authorization: Bearer vercel_abcdef1234567890abcdef1234" https://api.vercel.com';
  const clean = sanitizeLogText(rawLog);
  assert.ok(!clean.includes('vercel_abcdef1234567890abcdef1234'));
  assert.ok(clean.includes('[REDACTED_SECRET]'));
});

test('Secret Redaction - Redacts Command Line Passwords and Jenkins Tokens', () => {
  const rawLog1 = 'docker login -u user --password SuperSecretDockerPass123! registry.docker.io';
  const clean1 = sanitizeLogText(rawLog1);
  assert.ok(!clean1.includes('SuperSecretDockerPass123!'));
  assert.ok(clean1.includes('--password [REDACTED_SECRET]'));

  const rawLog2 = 'jenkins-cli --api-token JenkinsTokenXYZ987654 build job';
  const clean2 = sanitizeLogText(rawLog2);
  assert.ok(!clean2.includes('JenkinsTokenXYZ987654'));
  assert.ok(clean2.includes('--api-token [REDACTED_SECRET]'));
});

test('Secret Redaction - Preserves normal build output and logs', () => {
  const normalLog = 'vite v6.4.5 building for production... 1687 modules transformed. Built in 2.4s';
  const clean = sanitizeLogText(normalLog);
  assert.equal(clean, normalLog);
});
