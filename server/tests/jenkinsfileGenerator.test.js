import test from 'node:test';
import assert from 'node:assert/strict';
import { generateJenkinsfile } from '../src/services/pipeline/jenkinsfileGenerator.js';

test('Jenkinsfile Generator - Pure Static HTML/CSS/JS', () => {
  const config = {
    github_branch: 'main',
    install_command: '',
    build_command: '',
    output_directory: '.',
    docker_enabled: false,
    docker_publish_enabled: false,
  };

  const project = { id: 'proj-123', slug: 'my-html-site' };
  const jfile = generateJenkinsfile(config, project);

  assert.ok(jfile.includes("pipeline {"));
  assert.ok(jfile.includes("agent any"));
  assert.ok(jfile.includes("stage('Checkout')"));
  assert.ok(jfile.includes("stage('Environment Validation')"));
  assert.ok(jfile.includes("stage('Project Detection & Verification')"));
  assert.ok(jfile.includes("stage('Static Verification')"));
  assert.ok(!jfile.includes("stage('Install Dependencies')"));
  assert.ok(!jfile.includes("stage('Build Static Site')"));
  assert.ok(jfile.includes("stage('Validate Output Directory')"));
  assert.ok(jfile.includes("stage('Containerization Skipped')"));
  assert.ok(jfile.includes("archiveArtifacts"));
});

test('Jenkinsfile Generator - React + Vite Static Project', () => {
  const config = {
    github_branch: 'production',
    install_command: 'npm ci',
    build_command: 'npm run build',
    output_directory: 'dist',
    node_version: '20',
    docker_enabled: true,
    docker_publish_enabled: true,
    docker_repository: 'dockerdev/my-vite-app',
    docker_tag: 'v1.0.0',
  };

  const project = { id: 'proj-456', slug: 'my-vite-app' };
  const jfile = generateJenkinsfile(config, project);

  assert.ok(jfile.includes("stage('Install Dependencies')"));
  assert.ok(jfile.includes("npm ci"));
  assert.ok(jfile.includes("stage('Build Static Site')"));
  assert.ok(jfile.includes("npm run build"));
  assert.ok(jfile.includes("OUTPUT_DIR = 'dist'"));
  assert.ok(jfile.includes("stage('Docker Container Build')"));
  assert.ok(jfile.includes("stage('Docker Hub Publish')"));
  assert.ok(jfile.includes("dockerdev/my-vite-app:v1.0.0"));
  assert.ok(jfile.includes("withCredentials")); // Masked credentials
});

