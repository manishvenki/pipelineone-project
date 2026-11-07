/**
 * Project Detection Service
 * Analyzes directory structures, file lists, and package manifests to determine
 * the static project framework, build command, and output directory.
 * Safely inspects files without executing arbitrary scripts.
 */

export const analyzeStaticProject = (fileList = [], packageJsonContent = null) => {
  const normalizedFiles = fileList.map((f) => f.replace(/\\/g, '/').toLowerCase());

  // Check key markers
  const hasIndexHtml = normalizedFiles.some(
    (f) => f === 'index.html' || f.endsWith('/index.html') || f === 'public/index.html'
  );
  const hasPackageJson = normalizedFiles.some((f) => f === 'package.json');
  const hasLockFile = normalizedFiles.some(
    (f) => f === 'package-lock.json' || f === 'yarn.lock' || f === 'pnpm-lock.yaml'
  );
  const hasViteConfig = normalizedFiles.some((f) =>
    f.match(/^vite\.config\.(js|ts|mjs|cjs)$/) || f.includes('/vite.config.')
  );
  const hasPublicDir = normalizedFiles.some((f) => f.startsWith('public/'));
  const hasSrcDir = normalizedFiles.some((f) => f.startsWith('src/'));

  const cssFiles = normalizedFiles.filter((f) => f.endsWith('.css'));
  const jsFiles = normalizedFiles.filter((f) => f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx'));

  let detectedType = 'Static HTML/CSS/JS';
  let framework = 'HTML5 / Vanilla';
  let buildCommand = null;
  let outputDirectory = '.';
  let requiresBuild = false;

  let pkg = null;
  if (packageJsonContent) {
    try {
      pkg = typeof packageJsonContent === 'string' ? JSON.parse(packageJsonContent) : packageJsonContent;
    } catch {
      pkg = null;
    }
  }

  if (pkg) {
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const scripts = pkg.scripts || {};

    if (deps.vite) {
      if (deps.react || deps['react-dom']) {
        detectedType = 'Vite / React';
        framework = 'React';
      } else if (deps.vue) {
        detectedType = 'Vite / Vue';
        framework = 'Vue';
      } else if (deps.svelte) {
        detectedType = 'Vite / Svelte';
        framework = 'Svelte';
      } else {
        detectedType = 'Vite Static App';
        framework = 'Vite Vanilla';
      }
      outputDirectory = 'dist';
      buildCommand = scripts.build ? 'npm run build' : 'npx vite build';
      requiresBuild = true;
    } else if (deps['react-scripts']) {
      detectedType = 'Create React App';
      framework = 'React';
      outputDirectory = 'build';
      buildCommand = scripts.build ? 'npm run build' : null;
      requiresBuild = true;
    } else if (deps.astro) {
      detectedType = 'Astro Static Site';
      framework = 'Astro';
      outputDirectory = 'dist';
      buildCommand = scripts.build ? 'npm run build' : null;
      requiresBuild = true;
    } else if (deps.next) {
      detectedType = 'Next.js Static Export';
      framework = 'Next.js';
      outputDirectory = 'out';
      buildCommand = scripts.build ? 'npm run build' : null;
      requiresBuild = true;
    } else if (scripts.build) {
      detectedType = 'Node.js Static Web App';
      framework = 'Custom Bundler';
      outputDirectory = normalizedFiles.some((f) => f.startsWith('dist/')) ? 'dist' : 'build';
      buildCommand = 'npm run build';
      requiresBuild = true;
    } else {
      detectedType = 'JavaScript Static Project';
      framework = 'Node/Vanilla';
      outputDirectory = '.';
      buildCommand = null;
      requiresBuild = false;
    }
  } else if (hasViteConfig) {
    detectedType = 'Vite Static Project';
    framework = 'Vite';
    outputDirectory = 'dist';
    buildCommand = 'npx vite build';
    requiresBuild = true;
  } else if (hasIndexHtml) {
    detectedType = 'Static HTML/CSS/JS';
    framework = 'HTML5 / Vanilla';
    outputDirectory = '.';
    buildCommand = null;
    requiresBuild = false;
  } else if (jsFiles.length > 0 || cssFiles.length > 0) {
    detectedType = 'Static Assets Collection';
    framework = 'Static Files';
    outputDirectory = '.';
    buildCommand = null;
    requiresBuild = false;
  } else {
    detectedType = 'Generic Static Project';
    framework = 'Unknown';
    outputDirectory = '.';
    buildCommand = null;
    requiresBuild = false;
  }

  return {
    detectedType,
    framework,
    buildCommand,
    outputDirectory,
    requiresBuild,
    markers: {
      hasIndexHtml,
      hasPackageJson,
      hasLockFile,
      hasViteConfig,
      hasPublicDir,
      hasSrcDir,
      totalFiles: normalizedFiles.length,
      cssCount: cssFiles.length,
      jsCount: jsFiles.length,
    },
    suggestedBranch: 'main',
  };
};

export default {
  analyzeStaticProject,
};
