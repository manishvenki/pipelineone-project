import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyWebhookSignature } from '../src/services/pipeline/webhookService.js';

test('Webhook Signature - Valid HMAC-SHA256 signature is verified', () => {
  const secret = 'super-secret-key-123';
  const payload = JSON.stringify({ ref: 'refs/heads/main', repository: { full_name: 'test/repo' } });

  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const signatureHeader = `sha256=${hmac}`;

  const isValid = verifyWebhookSignature(payload, signatureHeader, secret);
  assert.equal(isValid, true);
});

test('Webhook Signature - Rejects altered payload or wrong secret', () => {
  const secret = 'super-secret-key-123';
  const payload = JSON.stringify({ ref: 'refs/heads/main' });

  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const signatureHeader = `sha256=${hmac}`;

  // Alter payload
  const alteredPayload = JSON.stringify({ ref: 'refs/heads/hack' });
  const isValidAltered = verifyWebhookSignature(alteredPayload, signatureHeader, secret);
  assert.equal(isValidAltered, false);

  // Wrong secret
  const isValidWrongSecret = verifyWebhookSignature(payload, signatureHeader, 'wrong-secret');
  assert.equal(isValidWrongSecret, false);
});

test('Webhook Signature - Rejects malformed or missing headers', () => {
  const secret = 'super-secret-key-123';
  const payload = JSON.stringify({ test: true });

  assert.equal(verifyWebhookSignature(payload, null, secret), false);
  assert.equal(verifyWebhookSignature(payload, 'md5=invalid', secret), false);
  assert.equal(verifyWebhookSignature(payload, 'sha256=', secret), false);
});

