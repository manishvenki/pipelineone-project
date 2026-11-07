# ==========================================
# Pipeline One Frontend — Production Dockerfile
# ==========================================

# Stage 1: Build static assets with Node
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine-slim AS runner
WORKDIR /usr/share/nginx/html

# Clean default html
RUN rm -rf ./*

# Copy built assets
COPY --from=builder /app/dist ./

# Copy nginx config with SPA routing and SSE proxy support
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
