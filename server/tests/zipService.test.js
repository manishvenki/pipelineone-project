import test from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { safelyExtractZip } from '../src/services/zipService.js';

test('ZIP Service - Safe extraction and static detection', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));
  const zipPath = path.join(tmpDir, 'sample-app.zip');
  const extractDir = path.join(tmpDir, 'extracted');

  // Create test ZIP archive
  const zip = new AdmZip();
  zip.addFile('index.html', Buffer.from('<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>'));
  zip.addFile('style.css', Buffer.from('body { background: #000; }'));
  zip.addFile('app.js', Buffer.from('console.log("ready");'));
  zip.writeZip(zipPath);

  // Extract
  const result = await safelyExtractZip(zipPath, extractDir);

  assert.equal(result.extractedFilesCount, 3);
  assert.equal(result.analysis.detectedType, 'Static HTML/CSS/JS');
  assert.equal(result.analysis.framework, 'HTML5 / Vanilla');
  assert.equal(fs.existsSync(path.join(extractDir, 'index.html')), true);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('ZIP Service - Zip Slip vulnerability prevention', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-slip-test-'));
  const zipPath = path.join(tmpDir, 'malicious.zip');
  const extractDir = path.join(tmpDir, 'extracted');

  // Create ZIP with directory traversal attempt by manually crafting entry name
  const zip = new AdmZip();
  zip.addFile('escape.txt', Buffer.from('malicious payload'));
  zip.getEntries()[0].entryName = '../../escape.txt';
  zip.writeZip(zipPath);

  // Attempt extract - must fail and throw Zip Slip error
  await assert.rejects(
    async () => {
      await safelyExtractZip(zipPath, extractDir);
    },
    (err) => {
      return err.message.includes('Zip Slip attempt');
    }
  );

  // Ensure file was not extracted outside target
  assert.equal(fs.existsSync(path.join(tmpDir, 'escape.txt')), false);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
