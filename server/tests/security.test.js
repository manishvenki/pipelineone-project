import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encrypt,
  decrypt,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  generateSecureState,
  validateSecureState,
} from '../src/utils/security.js';

test('Security Utils - AES-256-GCM Encryption & Decryption', () => {
  const secret = 'gho_myVerySecretGitHubOAuthToken1234567890';
  const encrypted = encrypt(secret);

  assert.notEqual(encrypted, secret);
  assert.equal(typeof encrypted, 'string');
  assert.equal(encrypted.split(':').length, 3, 'Payload must be iv:tag:content');

  const decrypted = decrypt(encrypted);
  assert.equal(decrypted, secret, 'Decrypted value must match original plaintext');
});

test('Security Utils - Password Hashing & Verification', async () => {
  const plain = 'StrongDevOpsPassword#2026';
  const hashed = await hashPassword(plain);

  assert.notEqual(hashed, plain);
  assert.ok(hashed.startsWith('$2'));

  const valid = await comparePassword(plain, hashed);
  assert.equal(valid, true);

  const invalid = await comparePassword('WrongPassword', hashed);
  assert.equal(invalid, false);
});

test('Security Utils - JWT Sign & Verify', () => {
  const payload = { id: 'usr-12345', email: 'dev@pipelineone.io' };
  const token = signToken(payload, '1h');

  assert.equal(typeof token, 'string');
  const decoded = verifyToken(token);
  assert.equal(decoded.id, payload.id);
  assert.equal(decoded.email, payload.email);
});

test('Security Utils - OAuth State Validation & HMAC signature', () => {
  const userId = 'usr-abcd-1234';
  const state = generateSecureState(userId);

  assert.equal(typeof state, 'string');
  const validated = validateSecureState(state);
  assert.ok(validated);
  assert.equal(validated.userId, userId);

  // Tampered state must be rejected
  const tampered = state.slice(0, -4) + 'abcd';
  const tamperedResult = validateSecureState(tampered);
  assert.equal(tamperedResult, null);

  // Expired state must be rejected
  const expiredState = `${userId}.randomtoken.${Date.now() - 3600000}.invalidsig`;
  assert.equal(validateSecureState(expiredState), null);
});
