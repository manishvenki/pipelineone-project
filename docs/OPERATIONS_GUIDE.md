# Pipeline One — Operations & Maintenance Guide

## 1. Daily Operations & System Health

### 1.1 Automated Health Probing
Verify service health via the JSON health endpoint:
```bash
curl -s http://localhost:5000/api/health | jq .
```
Expected output:
- `status: "ok"`
- `databases.postgresql.status: "connected"`
- `uptime`: Running seconds

### 1.2 Database Backup Schedule
Run database backups daily or prior to platform updates:
```bash
npm --prefix server run db:backup
```
Backups are archived in JSON format under `server/backups/`. Ensure offsite copy or S3 sync for enterprise environments.

---

## 2. Managing Platform Integrations

### 2.1 GitHub OAuth & Webhooks
- Check that `GITHUB_CALLBACK_URL` matches the registered GitHub OAuth application settings.
- If automatic webhook builds stop triggering:
  1. Inspect the Webhooks tab in GitHub repository settings.
  2. Verify recent delivery HTTP response codes.
  3. Ensure `GITHUB_WEBHOOK_SECRET` in `.env` matches the secret in the GitHub webhook payload configuration.

### 2.2 Jenkins CI Server
- The platform communicates with Jenkins via HTTP Basic Auth (Username + API Token).
- Check that the user has `Job/Build`, `Job/Configure`, and `Job/Read` permissions.
- In production, ensure Jenkins is hosted on a public domain or reachable via reverse proxy; internal subnets (`192.168.x`, `10.x`) are blocked by default by `ssrfValidator.js` unless `ALLOW_PRIVATE_JENKINS=true` is set.

### 2.3 Vercel Deployment
- Vercel tokens can be refreshed or reconnected directly from `/dashboard/integrations`.
- If static deployments fail with `401 Unauthorized`, re-issue a personal access token with appropriate scope in the Vercel dashboard.

---

## 3. Storage Cleanup & Log Retention
- Temporary ZIP uploads are stored under `server/uploads/` and extracted under `server/storage/extracted/`.
- Container build logs reside in `server/storage/build-logs/`.
- To clean up stale extracted files older than 30 days:
```bash
find server/storage/extracted/ -type f -mtime +30 -delete
```

