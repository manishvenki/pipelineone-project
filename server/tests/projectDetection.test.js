import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeStaticProject } from '../src/services/projectDetectionService.js';

test('Project Detection - Pure Static HTML/CSS/JS', () => {
  const files = ['index.html', 'styles/main.css', 'scripts/app.js'];
  const analysis = analyzeStaticProject(files);

  assert.equal(analysis.detectedType, 'Static HTML/CSS/JS');
  assert.equal(analysis.framework, 'HTML5 / Vanilla');
  assert.equal(analysis.outputDirectory, '.');
  assert.equal(analysis.buildCommand, null);
  assert.equal(analysis.requiresBuild, false);
  assert.equal(analysis.markers.hasIndexHtml, true);
  assert.equal(analysis.markers.hasPackageJson, false);
});

test('Project Detection - Vite + React Static Project', () => {
  const files = [
    'index.html',
    'vite.config.js',
    'package.json',
    'src/App.jsx',
    'src/main.jsx',
    'public/favicon.ico',
  ];
  const pkg = {
    name: 'sample-vite-react',
    dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
    devDependencies: { vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0' },
    scripts: { build: 'vite build' },
  };

  const analysis = analyzeStaticProject(files, pkg);

  assert.equal(analysis.detectedType, 'Vite / React');
  assert.equal(analysis.framework, 'React');
  assert.equal(analysis.outputDirectory, 'dist');
  assert.equal(analysis.buildCommand, 'npm run build');
  assert.equal(analysis.requiresBuild, true);
  assert.equal(analysis.markers.hasViteConfig, true);
});

test('Project Detection - Create React App', () => {
  const files = ['public/index.html', 'package.json', 'src/index.js', 'src/App.js'];
  const pkg = {
    name: 'cra-app',
    dependencies: { react: '^18.0.0', 'react-scripts': '5.0.1' },
    scripts: { build: 'react-scripts build' },
  };

  const analysis = analyzeStaticProject(files, pkg);

  assert.equal(analysis.detectedType, 'Create React App');
  assert.equal(analysis.framework, 'React');
  assert.equal(analysis.outputDirectory, 'build');
  assert.equal(analysis.buildCommand, 'npm run build');
  assert.equal(analysis.requiresBuild, true);
});

test('Project Detection - Astro Static Site', () => {
  const files = ['package.json', 'src/pages/index.astro'];
  const pkg = {
    dependencies: { astro: '^4.0.0' },
    scripts: { build: 'astro build' },
  };

  const analysis = analyzeStaticProject(files, pkg);

  assert.equal(analysis.detectedType, 'Astro Static Site');
  assert.equal(analysis.outputDirectory, 'dist');
  assert.equal(analysis.requiresBuild, true);
});

