# Pipeline One — Production Deployment Guide

## 1. Overview & Deployment Strategy

Pipeline One follows a decoupled deployment architecture:
- **Frontend SPA:** Built with Vite and served via Nginx (Docker) or deployed to Vercel/Netlify.
- **Backend API & CI/CD Orchestrator:** Containerized Node.js service running on Linux VM / Docker host with access to Docker Engine socket and outbound networking to Jenkins and Vercel.
- **Primary Database:** Managed PostgreSQL 18 instance with connection pooling.
- **Secondary Store:** Managed MongoDB Atlas cluster (optional diagnostic telemetry).

---

## 2. Docker Compose Production Deployment

The recommended self-contained deployment method uses [`docker-compose.production.yml`](../docker-compose.production.yml):

```bash
# 1. Clone repository
git clone https://github.com/manishvenki/pipelineone-project.git
cd pipelineone-project

# 2. Configure environment variables
cp .env.example .env
# Edit .env with production secrets (JWT_SECRET, ENCRYPTION_KEY, etc.)

# 3. Launch the production stack
docker compose -f docker-compose.production.yml up -d --build

# 4. Apply relational schema migrations
docker compose -f docker-compose.production.yml exec server npm run migrate

# 5. Verify service health
curl -f http://localhost/api/health
```

---

## 3. Environment Variables Reference

| Variable | Description | Required? | Example |
|---|---|---|---|
| `PORT` | Node.js backend port | Yes (default 5000) | `5000` |
| `NODE_ENV` | Runtime mode | Yes | `production` |
| `CLIENT_URL` | Public frontend origin for CORS | Yes | `https://pipelineone.example.com` |
| `JWT_SECRET` | 32+ character key for JWT signing | Yes | `crypto.randomBytes(32).toString('hex')` |
| `ENCRYPTION_KEY` | 32-byte hex string for AES-256-GCM vault | Yes | `crypto.randomBytes(32).toString('hex')` |
| `DATABASE_URL` | PostgreSQL connection URI | Yes | `postgresql://user:pass@host:5432/db` |
| `ALLOW_PRIVATE_JENKINS` | SSRF protection override for private subnets | No (keep `false` in prod) | `false` |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | Optional | `Iv1.xxxxxxxxxxxx` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | Optional | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `GITHUB_WEBHOOK_SECRET` | Secret for GitHub Webhook verification | Optional | `webhook_shared_secret` |
| `VERCEL_CLIENT_ID` | Vercel OAuth Client ID | Optional | `oac_xxxxxxxxxxxx` |
| `VERCEL_CLIENT_SECRET` | Vercel OAuth Client Secret | Optional | `xxxxxxxxxxxxxxxxxxxxxxxx` |

---

## 4. Frontend SPA Deployment (Vercel)

1. Connect `pipelineone-project` repository to Vercel.
2. Root Directory: `client`.
3. Framework Preset: `Vite`.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Environment Variables:
   - `VITE_API_URL`: `https://api.pipelineone.example.com`

---

## 5. Health Check & Diagnostics

The backend provides a public JSON health check at `/api/health`:
```bash
curl -i https://api.pipelineone.example.com/api/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-11-07T09:40:00.000Z",
  "uptime": 3600,
  "databases": {
    "postgresql": { "status": "connected", "mode": "relational_primary" },
    "mongodb": { "status": "connected", "mode": "document_secondary" }
  },
  "environment": "production"
}
```

---

## 6. Backup & Disaster Recovery Operations

### Create Backup Snapshot
```bash
npm --prefix server run db:backup
```
Generates a JSON snapshot under `server/backups/pipelineone-backup-<timestamp>.json` with all 16 tables.

### Restore From Snapshot
```bash
node server/src/database/backupRestore.js restore server/backups/<backup-file>.json
```
Truncates and restores tables in strict topological foreign-key order.

