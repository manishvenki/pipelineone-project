# Jenkins Server Integration & Security Architecture

Pipeline One connects securely to Jenkins CI servers to inspect jobs, review pipeline statuses, verify CSRF crumb issuers, and prepare execution hooks.

---

## 1. Security Architecture & SSRF Defenses

Connecting a cloud platform to arbitrary user-supplied URLs poses significant Server-Side Request Forgery (SSRF) vulnerabilities. To protect Pipeline One infrastructure, all Jenkins server connections pass through a multi-tier SSRF defense engine (`server/src/utils/ssrfValidator.js`):

### Enforced Protection Rules:
1. **Protocol Restriction:** Only `http:` and `https:` schemes are permitted. File, FTP, and Gopher protocols are rejected.
2. **Credential Sanitization:** Inline URI credentials (e.g., `http://admin:pass@host/`) are blocked.
3. **Cloud Metadata IP Blocking:** Access to cloud instance metadata services is strictly denied:
   - AWS / GCP / Azure: `169.254.169.254`
   - GCP internal DNS: `metadata.google.internal`
   - DigitalOcean: `169.254.169.254`
4. **Private Subnet Restrictions:** RFC 1918 and loopback address spaces are blocked by default:
   - `127.0.0.0/8` (Loopback / Localhost)
   - `10.0.0.0/8` (Class A Private)
   - `172.16.0.0/12` (Class B Private)
   - `192.168.0.0/16` (Class C Private)
   - `0.0.0.0/8`
5. **DNS Rebinding Guard:** Hostnames are resolved through DNS lookups before dispatching HTTP requests to ensure they do not resolve to internal or loopback IP ranges.
6. **Development Exception Flag:** When running in local development mode with a Dockerized Jenkins instance on localhost, set `ALLOW_PRIVATE_JENKINS=true` in `.env`. This flag must remain disabled in production environments.

---

## 2. Generating a Jenkins User API Token

Pipeline One requires HTTP Basic Authentication using an **API Token**, not your user login password.

### Steps to create an API token:
1. Log in to your Jenkins server.
2. Click your username in the top-right navigation bar to open your user profile.
3. Select **Configure** in the left sidebar menu.
4. Scroll to the **API Token** section.
5. Click **Add new Token**.
6. Provide a descriptive name: `Pipeline One DevOps Connector`.
7. Click **Generate** and copy the 32-character hexadecimal token immediately.
8. Click **Save** at the bottom of the page.

---

## 3. Required Jenkins Permissions

The connected user account should have the following minimum Matrix-based or Role-based permissions:

| Category | Permission | Purpose |
|----------|------------|---------|
| **Overall** | `Read` | Inspect Jenkins instance info & CSRF crumb issuer |
| **Job** | `Read` | Enumerate jobs, view job configurations & builds |
| **Job** | `Build` (Phase 3) | Trigger automated CI pipelines |
| **View** | `Read` | List jobs in standard views |

---

## 4. CSRF Crumb Management

Modern Jenkins controllers enforce CSRF protection via Crumb issuers. Pipeline One automatically detects and respects this:

1. When verifying or dispatching calls, Pipeline One queries `GET /crumbIssuer/api/json`.
2. If Crumb protection is active, it extracts `crumbRequestField` (typically `Jenkins-Crumb`) and the crumb hash.
3. All subsequent state-changing requests automatically attach the crumb in HTTP headers.

---

## 5. Connecting Jenkins in Pipeline One

### In the UI:
1. Open `/dashboard/integrations`.
2. Click **Connect Jenkins** on the Jenkins card.
3. Input:
   - **Server URL:** e.g., `https://jenkins.example.com` or `http://localhost:8080` (with dev flag enabled).
   - **Username:** Your Jenkins username.
   - **API Token:** The generated 32-character API token.
   - **Connection Label:** Optional friendly name (e.g., `Production Jenkins`).
4. Click **Connect Jenkins**.

### Via API:
```bash
POST /api/integrations/jenkins/connect
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "serverUrl": "https://jenkins.example.com",
  "username": "admin",
  "apiToken": "11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "displayName": "Staging Jenkins"
}
```

---

## 6. Inspecting Jenkins Jobs

- **List All Jobs:** `GET /api/jenkins/jobs`
- **Inspect Specific Job:** `GET /api/jenkins/jobs/:jobName`
- **Click "Jobs"** on the Jenkins card in the Integrations Hub to view job names, color statuses (`blue` = success, `red` = failed, `anime` = building), and direct links.
