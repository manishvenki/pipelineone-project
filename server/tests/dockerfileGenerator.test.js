import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDockerfile, generateDockerignore } from '../src/services/dockerfileGenerator.js';

test('Dockerfile Generator - Pure Static HTML/CSS/JS', () => {
  const result = generateDockerfile({
    detectedType: 'Static HTML/CSS/JS',
    framework: 'HTML5 / Vanilla',
    requiresBuild: false,
    buildCommand: null,
    outputDirectory: '.',
  });

  assert.equal(result.stagesCount, 1);
  assert.equal(result.baseImage, 'nginx:alpine-slim');
  assert.equal(result.exposedPort, 80);
  assert.equal(result.requiresBuild, false);
  assert.ok(result.dockerfile.includes('FROM nginx:alpine-slim'));
  assert.ok(result.dockerfile.includes('COPY . /usr/share/nginx/html/'));
  assert.ok(result.dockerfile.includes('EXPOSE 80'));
});

test('Dockerfile Generator - React + Vite Multi-stage Build', () => {
  const result = generateDockerfile({
    detectedType: 'Vite / React',
    framework: 'React',
    requiresBuild: true,
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    markers: { hasLockFile: true },
  });

  assert.equal(result.stagesCount, 2);
  assert.equal(result.builderImage, 'node:20-alpine');
  assert.equal(result.baseImage, 'nginx:alpine-slim');
  assert.equal(result.requiresBuild, true);
  assert.equal(result.outputDirectory, 'dist');

  // Verify multi-stage structure
  assert.ok(result.dockerfile.includes('FROM node:20-alpine AS builder'));
  assert.ok(result.dockerfile.includes('npm ci --prefer-offline --no-audit'));
  assert.ok(result.dockerfile.includes('RUN npm run build'));
  assert.ok(result.dockerfile.includes('FROM nginx:alpine-slim AS runner'));
  assert.ok(result.dockerfile.includes('COPY --from=builder /app/dist /usr/share/nginx/html/'));
});

test('Dockerfile Generator - Custom Output Directory (build)', () => {
  const result = generateDockerfile({
    detectedType: 'Create React App',
    framework: 'React',
    requiresBuild: true,
    buildCommand: 'npm run build',
    outputDirectory: 'build',
    markers: { hasLockFile: false },
  });

  assert.equal(result.outputDirectory, 'build');
  assert.ok(result.dockerfile.includes('COPY --from=builder /app/build /usr/share/nginx/html/'));
  assert.ok(result.dockerfile.includes('npm install --no-audit'));
});

test('Dockerfile Generator - .dockerignore content', () => {
  const ignore = generateDockerignore();
  assert.ok(ignore.includes('.git'));
  assert.ok(ignore.includes('.env*'));
  assert.ok(ignore.includes('node_modules'));
  assert.ok(ignore.includes('*.pem'));
});

