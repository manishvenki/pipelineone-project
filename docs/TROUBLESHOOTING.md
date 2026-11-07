# Pipeline One — Troubleshooting & Diagnostics Guide

## 1. Common Issues & Resolutions

### 1.1 Webhook Delivery Fails with 401 "Invalid webhook signature"
- **Cause:** The HMAC-SHA256 signature calculated by `webhookService.js` did not match the header `X-Hub-Signature-256`.
- **Resolution:**
  1. Verify the shared secret in GitHub repository settings matches the project's webhook secret.
  2. The webhook secret can be viewed or regenerated in `/dashboard/projects/:id` under the Pipeline Settings modal.

### 1.2 Jenkins Connection Fails with "SSRF Blocked: Private IP"
- **Cause:** The provided Jenkins URL resolved to a loopback (`127.0.0.1`), link-local (`169.254.x.x`), or private subnet (`192.168.x.x`, `10.x.x.x`).
- **Resolution:**
  - In production, host Jenkins on an external domain with public DNS.
  - In local development, configure `ALLOW_PRIVATE_JENKINS=true` in `server/.env`.

### 1.3 Static Website Build Fails with "Output directory dist not found"
- **Cause:** The project build output directory is set to `dist`, but the build framework outputs to `build`, `out`, or the project root.
- **Resolution:**
  1. Navigate to `/dashboard/projects/:id`.
  2. Open "Configure Pipeline".
  3. Update "Output Directory" to the actual build destination (e.g. `build` for CRA, `out` for Next.js static, or `.` for pure HTML).
  4. Trigger a new execution or retry the failed run.

### 1.4 Real-Time Logs Not Streaming in Browser
- **Cause:** Reverse proxy (Nginx, Cloudflare) is buffering Server-Sent Events (SSE) or terminating idle TCP connections.
- **Resolution:**
  - Verify that the reverse proxy has `proxy_buffering off;` and `proxy_cache off;` configured for `/api/`.
  - The backend emits periodic keepalive comments (`: ping\n\n`) every 15 seconds to prevent timeout closures.

### 1.5 Database Connection Error: "ECONNREFUSED 127.0.0.1:5432"
- **Cause:** PostgreSQL is not running or port 5432 is blocked.
- **Resolution:**
  1. Start the PostgreSQL service: `sudo systemctl start postgresql` or ensure the Docker database container is healthy.
  2. Check connection parameters (`PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`) in `.env`.
  3. Run `npm --prefix server run migrate` to apply any missing schema tables.
