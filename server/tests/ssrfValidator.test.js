import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUrlForSsrf } from '../src/utils/ssrfValidator.js';

test('SSRF Validator - Rejects non-HTTP protocols', async () => {
  const dangerousProtocols = [
    'ftp://server.example.com',
    'gopher://server.example.com:70',
    'file:///etc/passwd',
    'ssh://git@github.com',
    'ws://echo.websocket.org',
  ];

  for (const url of dangerousProtocols) {
    await assert.rejects(
      async () => {
        await validateUrlForSsrf(url);
      },
      (err) => err.message.includes('Forbidden protocol')
    );
  }
});

test('SSRF Validator - Blocks private and loopback IP addresses', async () => {
  const privateIps = [
    'http://127.0.0.1:8080',
    'http://127.0.1.1',
    'http://10.0.0.1:8080',
    'http://172.16.0.5:8080',
    'http://192.168.1.100:8080',
    'http://169.254.169.254/latest/meta-data/', // AWS metadata
    'http://localhost:8080',
    'http://metadata.google.internal', // GCP metadata
  ];

  for (const url of privateIps) {
    await assert.rejects(
      async () => {
        await validateUrlForSsrf(url, { allowPrivate: false });
      },
      (err) => {
        return (
          err.message.includes('prohibited') ||
          err.message.includes('blocked') ||
          err.message.includes('protected')
        );
      }
    );
  }
});

test('SSRF Validator - Rejects inline credentials in URL', async () => {
  await assert.rejects(
    async () => {
      await validateUrlForSsrf('http://admin:secret123@example.com/jenkins');
    },
    (err) => err.message.includes('inline user credentials')
  );
});

test('SSRF Validator - Accepts valid external public URLs', async () => {
  const valid = await validateUrlForSsrf('https://github.com');
  assert.equal(valid.valid, true);
  assert.equal(valid.protocol, 'https:');
  assert.equal(valid.hostname, 'github.com');
});
