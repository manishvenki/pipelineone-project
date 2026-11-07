# Pipeline One — Final System Architecture

## 1. System Overview

**Pipeline One** is a lightweight, unified DevOps automation platform designed primarily for static website projects. It bridges the gap between source code repositories (GitHub, local archives) and cloud deployment pipelines through:
- Intelligent static project heuristics and detection
- Encrypted AES-256-GCM credential vaults
- Programmatic Jenkins Declarative Pipeline generation and orchestration
- Multi-stage Docker containerization and Docker Hub publishing
- Automated static asset hashing and Vercel edge deployment
- Real-time Server-Sent Events (SSE) telemetry and 10-stage execution visualization

```
                                  PIPELINE ONE
                          SYSTEM ARCHITECTURE OVERVIEW

+-----------------------------------------------------------------------------------+
|                              Client Web Application                                |
|    (React 18, Vite, Tailwind CSS, Lucide Icons, EventSource Real-Time Client)     |
+-----------------------------------------------------------------------------------+
           |                                                      ^
    HTTPS REST APIs                                        SSE Stream (/stream)
           |                                                      |
           v                                                      |
+-----------------------------------------------------------------------------------+
|                         Pipeline One Node.js / Express                             |
|  - Auth & JWT Service (Bcrypt, Cookie Session, HttpOnly)                          |
|  - AES-256-GCM Credential Vault (GitHub, Docker Hub, Jenkins, Vercel)            |
|  - Static Project Heuristics Engine (HTML/CSS, React+Vite, Astro, CRA)            |
|  - Zip-Slip Protected Extraction Engine (Adm-Zip)                                 |
|  - Pipeline Orchestrator & State Machine (10 Canonical Stages)                    |
|  - Jenkins Job & Declarative Jenkinsfile Generator                                |
|  - Docker Engine Subprocess Controller & Multi-Stage Generator                    |
|  - Vercel Deployment Client (SHA-1 hashing & upload)                              |
|  - Server-Side Secret Redaction (Regex Masking)                                    |
|  - In-App Notification Center & Analytics Telemetry Engine                         |
+-----------------------------------------------------------------------------------+
       |                    |                    |                   |
       v                    v                    v                   v
+--------------+    +----------------+   +---------------+   +------------------+
|  PostgreSQL  |    | MongoDB Atlas  |   |    Jenkins    |   |   Docker Engine  |
|  18 Engine   |    | (Diagnostics)  |   | Orchestration |   |    & Registry    |
+--------------+    +----------------+   +---------------+   +------------------+
                                                                     |
                                                                     v
                                                             +------------------+
                                                             |   Vercel Edge    |
                                                             |    Deployment    |
                                                             +------------------+
```

---

## 2. Multi-Tier Relational Database Design (PostgreSQL 18)

The relational schema comprises **16 fully indexed, foreign-key enforced tables**:

```
[users]
  │
  ├── [user_settings]
  ├── [connected_integrations]
  ├── [activity_records]
  ├── [notifications]
  └── [projects]
        │
        ├── [project_repositories]
        ├── [docker_builds] ── [docker_images]
        ├── [pipeline_configurations]
        ├── [github_webhook_events]
        └── [pipeline_executions]
              │
              ├── [pipeline_events]
              └── [pipeline_stage_events]
```

### Table Inventory
1. `users`: Multi-tenant user accounts, bcrypt password hashes, profile metadata.
2. `connected_integrations`: Encrypted credential vault (`access_token_enc`, `refresh_token_enc`) for GitHub, Docker Hub, Jenkins, Vercel.
3. `projects`: Static website workspaces (`github` or `zip`), detected framework, output dir.
4. `project_repositories`: GitHub repo metadata, owner, branch tracking.
5. `user_settings`: Notification preferences, theme, telemetry toggles.
6. `activity_records`: Audit trail of user and system events.
7. `docker_builds`: Container build records, tags, status, log paths.
8. `docker_images`: Published container image tags, digests, registries.
9. `pipeline_configurations`: Build parameters, environment, Docker toggles, per-project webhook secrets.
10. `pipeline_executions`: End-to-end execution history, commit SHAs, runtimes, deployment URLs.
11. `pipeline_events`: Line-by-line execution logs and stage events.
12. `github_webhook_events`: Idempotency tracking (`delivery_id`), deduplication guard.
13. `integration_verification_events`: Connectivity verification history.
14. `platform_connection_metadata`: Provider API capabilities and rate limit quotas.
15. `pipeline_stage_events`: Granular 10-stage execution telemetry with millisecond durations.
16. `notifications`: In-app notification center records with read state and deep links.

---

## 3. The 10 Canonical Pipeline Stages

The platform formalizes automated static website CI/CD into 10 observable sequential stages:
1. `github_source`: Webhook ingestion or manual trigger initiation.
2. `jenkins_queue`: Jenkins queue allocation and node assignment.
3. `source_checkout`: Git repository cloning and commit SHA checkout.
4. `installing_dependencies`: Package installation (`npm ci` / `yarn`).
5. `build`: Static site build execution (`npm run build`).
6. `static_output_validation`: Artifact validation ensuring `index.html` and non-empty output directory exist.
7. `docker_build` *(optional)*: Multi-stage Nginx containerization.
8. `docker_hub_publish` *(optional)*: Docker Hub registry push.
9. `vercel_deployment`: Direct file upload and deployment to Vercel edge network.
10. `deployment_verification`: Live site HTTP status 200 health verification and latency benchmarking.

---

## 4. Multi-Tenant Authorization Isolation Guarantee

Multi-user isolation is enforced through:
- **JWT Verification & Identity Injection:** `authMiddleware.js` verifies the JWT signature and extracts `req.userId`.
- **Row-Level Ownership Validation:** All SQL queries join against or explicitly filter by `user_id = $1`.
- **Cross-User Protection:** User B is rejected with `404 Not Found` when attempting to query or mutate User A's projects, configurations, executions, Docker builds, or notifications.
- **Zero Information Leakage:** Unauthorized requests return standard 404 responses rather than revealing resource existence.

