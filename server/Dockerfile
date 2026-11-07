# ==========================================
# Pipeline One Backend — Production Dockerfile
# ==========================================

# Stage 1: Dependency resolution
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Final runtime container
FROM node:20-alpine AS runner
WORKDIR /app

# Install docker CLI & git for CI/CD worker operations if mounted
RUN apk add --no-cache docker-cli git curl

ENV NODE_ENV=production
ENV PORT=5000

# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Ensure storage directories exist
RUN mkdir -p storage/build-logs storage/zips storage/extracted uploads backups && \
    addgroup -g 1001 -S nodejs && \
    adduser -S pipelineone -u 1001 && \
    chown -R pipelineone:nodejs /app

USER pipelineone

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]

