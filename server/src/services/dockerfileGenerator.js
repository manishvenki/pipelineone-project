/**
 * Dockerfile Generator Service
 * Generates secure, minimal, multi-stage Dockerfiles tailored to the project's static framework.
 */

export const generateDockerfile = (projectAnalysis = {}) => {
  const {
    detectedType = 'Static HTML/CSS/JS',
    framework = 'HTML5 / Vanilla',
    buildCommand = null,
    outputDirectory = 'dist',
    requiresBuild = false,
    markers = {},
  } = projectAnalysis;

  // 1. Pure HTML/CSS/JS projects (no build step required)
  if (!requiresBuild || !buildCommand) {
    const dockerfile = `# Multi-stage: Production Web Server
FROM nginx:alpine-slim

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy static assets to web root
COPY . /usr/share/nginx/html/

# Standard static site nginx configuration
RUN echo 'server { \\
    listen 80; \\
    server_name localhost; \\
    location / { \\
        root /usr/share/nginx/html; \\
        index index.html index.htm; \\
        try_files $uri $uri/ /index.html; \\
    } \\
    error_page 500 502 503 504 /50x.html; \\
    location = /50x.html { \\
        root /usr/share/nginx/html; \\
    } \\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

# Run nginx as non-daemon
CMD ["nginx", "-g", "daemon off;"]
`;
    return {
      dockerfile,
      stagesCount: 1,
      baseImage: 'nginx:alpine-slim',
      exposedPort: 80,
      requiresBuild: false,
    };
  }

  // 2. React / Vite / Node.js Static Build projects (Multi-stage)
  const installCmd = markers.hasLockFile ? 'npm ci --prefer-offline --no-audit' : 'npm install --no-audit';
  const effectiveBuildCmd = buildCommand || 'npm run build';
  const cleanOutputDir = outputDirectory && outputDirectory !== '.' ? outputDirectory.replace(/^\.\//, '') : 'dist';

  const dockerfile = `# ==========================================
# Stage 1: Build Application Environment
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Optimize layer caching for dependencies
COPY package*.json ./
${markers.hasLockFile ? 'COPY package-lock.json* yarn.lock* pnpm-lock.yaml* ./' : ''}

# Install dependencies securely
RUN ${installCmd}

# Copy source tree
COPY . .

# Execute static site build
RUN ${effectiveBuildCmd}

# ==========================================
# Stage 2: Minimal Production Web Server
# ==========================================
FROM nginx:alpine-slim AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static artifacts from builder stage
COPY --from=builder /app/${cleanOutputDir} /usr/share/nginx/html/

# Custom SPA routing support
RUN echo 'server { \\
    listen 80; \\
    server_name localhost; \\
    location / { \\
        root /usr/share/nginx/html; \\
        index index.html index.htm; \\
        try_files $uri $uri/ /index.html; \\
    } \\
    error_page 500 502 503 504 /50x.html; \\
    location = /50x.html { \\
        root /usr/share/nginx/html; \\
    } \\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;

  return {
    dockerfile,
    stagesCount: 2,
    builderImage: 'node:20-alpine',
    baseImage: 'nginx:alpine-slim',
    exposedPort: 80,
    requiresBuild: true,
    outputDirectory: cleanOutputDir,
  };
};

/**
 * Returns safe .dockerignore content to exclude credentials and runtime junk from the build context
 */
export const generateDockerignore = () => {
  return `# VCS and logs
.git
.gitignore
.github
*.log
npm-debug.log*

# Secrets and environment configurations
.env*
*.pem
*.key
*.cert

# Dependencies and caches
node_modules
.cache
.npm
dist
build
.DS_Store
Thumbs.db
`;
};

export default {
  generateDockerfile,
  generateDockerignore,
};
