# Pipeline One 🚀
### Modern DevOps Automation Platform for Static Website Projects

> **"From Repository to Deployment. Simplified."**

Pipeline One is a lightweight DevOps automation platform designed primarily for static website projects. It bridges the gap between source code repositories (GitHub, local archives) and cloud deployment pipelines through intelligent static project heuristics, AES-256-GCM encrypted credential vaults, programmatic Jenkins Declarative Pipeline orchestration, multi-stage Docker containerization, automated Vercel edge delivery, and real-time Server-Sent Events (SSE) telemetry.

---

## 📌 Development Status: Complete (All 5 Phases Production-Ready)

- [x] **Phase 1: Foundation, Application Architecture & GitHub Integration** *(Completed)*
- [x] **Phase 2: Real Platform Integrations (Docker Hub, Jenkins, Vercel) & Containerization Engine** *(Completed)*
- [x] **Phase 3: Automated CI/CD Pipeline Orchestration Engine** *(Completed)*
- [x] **Phase 4: Real-Time Pipeline Visualization, Monitoring & Deployment Analytics** *(Completed)*
- [x] **Phase 5: Production Hardening, Multi-Target Routing & Enterprise Release** *(Completed)*

---

## 1. Overview
Pipeline One eliminates manual deployment complexity for frontend engineers and small DevOps teams. By analyzing static web repositories, Pipeline One automatically generates declarative CI/CD pipelines, provisions multi-stage Docker container environments, verifies build artifacts, and coordinates real-time deployments to modern edge platforms without requiring engineers to manually author Jenkinsfiles or configure webhooks from scratch.

## 2. Problem Statement
Deploying static web applications often presents fragmented hurdles:
1. **Toolchain Disconnection:** Developers switch between GitHub, Jenkins, Docker Hub, and Vercel consoles just to observe a single commit's deployment.
2. **Boilerplate Fatigue:** Writing repetitive Jenkinsfiles, Dockerfiles, and Nginx configurations for every single static project.
3. **Secret Exposure Risk:** Pipeline logs frequently leak Personal Access Tokens, API keys, and deployment passwords.
4. **Visibility Gaps:** Lack of real-time build streaming and granular stage timing makes pinpointing deployment failures tedious.

Pipeline One solves this by acting as a single, secure control plane that unifies source code, containerization, CI execution, and edge hosting into an observable 10-stage visual workflow.

## 3. Key Features
- 🐙 **GitHub Integration & Repository Explorer:** Full OAuth 2.0 flow with signed HMAC states, personal access token connection, live repository browsing, branch selection, and directory inspection.
- 📦 **Direct ZIP Archive Upload:** Drag-and-drop static project archive upload with strict Zip-Slip path traversal defense.
- 🔍 **Static Project Heuristics Engine:** Automatic framework detection for Pure HTML/CSS/JS, Vite + React, Astro, and Create React App with automatic build command and output directory inference.
- 🐳 **Docker Hub & Multi-Stage Container Engine:** Generates production-ready `nginx:alpine-slim` containers (reducing image size from >600MB to ~25MB) with automated Docker Hub registry pushing.
- 🏗️ **Jenkins Pipeline Automation:** Programmatic Declarative Jenkinsfile generation, CSRF crumb tracking, queue item allocation, and console streaming.
- ▲ **Automated Vercel Edge Deployment:** Recursive static asset SHA-1 hashing, direct upload via `/v2/files`, deployment creation, and live health probing.
- 🎨 **10-Stage Pipeline Visualizer:** Interactive connected node visualizer (`github_source` → `jenkins_queue` → `source_checkout` → `dependencies` → `build` → `validation` → `docker_build` → `docker_publish` → `vercel_deploy` → `verification`) with live duration tooltips and stage filter clicks.
- 🔒 **Server-Side Secret Redaction:** Strict regex masking prevents GitHub PATs, Vercel tokens, JWTs, Bearer headers, passwords, and Jenkins tokens from ever being persisted or broadcasted over SSE.
- 💻 **Live Terminal Console:** Developer log console with timestamps, stage tags, search filter, log level toggles (`INFO`, `WARN`, `ERROR`, `SUCCESS`), pause/resume streaming, auto-scroll lock, copy to clipboard, and `.txt` file export.
- 📊 **Deployment Analytics & Telemetry:** Daily deployment frequency charts, SVG reliability gauges, build latency benchmarks (fastest, average, slowest), and project volume breakdowns.
- 🔔 **In-App Notification Center:** Navbar bell with unread badge counter, stage event alerts (start, build pass/fail, docker publish, vercel live, cancel), and direct navigation to pipeline executions.
- 🛡️ **Multi-Tenant Authorization Isolation:** Complete data and execution isolation between users verified across all 16 database entities.

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS, React Router v6, Lucide React Icons |
| **Backend** | Node.js (v20+), Express.js, REST APIs, Server-Sent Events (SSE) |
| **Databases** | PostgreSQL 18 (Primary Relational), MongoDB Atlas (Secondary Diagnostics) |
| **Containerization** | Docker Engine CLI, Multi-stage Nginx Alpine & Node Alpine images |
| **Security** | AES-256-GCM Vault, SSRF DNS Validator, Bcrypt, JWT, Helmet, Express Rate Limit |
| **Reverse Proxy** | Nginx Alpine (SPA rewrite, Gzip compression, SSE proxying) |
| **Testing** | Node.js Native Test Runner (`node --test`), 16 Test Suites, 59 Passing Tests |

## 5. System Architecture
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

## 6. CI/CD Workflow (10 Canonical Stages)
Each deployment execution progresses through 10 ordered milestones:
1. `github_source`: GitHub webhook payload parsed or manual run dispatched.
2. `jenkins_queue`: Jenkins build job queued and node worker allocated.
3. `source_checkout`: Git repository cloned and target commit SHA checked out.
4. `installing_dependencies`: Package resolution (`npm ci` / `yarn install`).
5. `build`: Static framework compilation (`npm run build`).
6. `static_output_validation`: Artifact check verifying non-empty output folder and `index.html`.
7. `docker_build` *(optional)*: Multi-stage Nginx container image built.
8. `docker_hub_publish` *(optional)*: Container image tagged and pushed to Docker Hub.
9. `vercel_deployment`: Static assets uploaded and deployed to Vercel edge network.
10. `deployment_verification`: Live site HTTP status 200 health check and latency benchmarking.

## 7. Platform Integrations
- **GitHub:** OAuth 2.0 / PAT authentication, branch selection, automatic webhook triggering on `git push`.
- **Docker Hub:** Secure token credential vault, repository inspection, container image publishing.
- **Jenkins:** HTTP Basic Auth (User + API Token), dynamic `WorkflowJob` provisioning, SSRF defense.
- **Vercel:** Direct SHA-1 file upload API, project linking, edge deployment verification.

## 8. Database Design (16 Relational Tables)
PostgreSQL 18 relational schema with full foreign-key constraints, cascading deletes, and optimized B-tree indexes:
- `users`: User identity and bcrypt password hashes.
- `connected_integrations`: Encrypted credential vault (`access_token_enc`, `refresh_token_enc`).
- `projects`: Static site metadata, source type, detected framework, output dir.
- `project_repositories`: GitHub repository details, default/selected branch.
- `user_settings`: User preferences and theme selections.
- `activity_records`: Audit log of user actions.
- `docker_builds`: Container build records, tags, status, log paths.
- `docker_images`: Published container image tags, digests.
- `pipeline_configurations`: Build commands, output dir, per-project webhook secrets.
- `pipeline_executions`: Run history, commit SHAs, status, live URLs.
- `pipeline_events`: Line-by-line build logs and event records.
- `github_webhook_events`: Idempotency tracking (`delivery_id`) and duplicate rejection.
- `integration_verification_events`: Connectivity verification audit log.
- `platform_connection_metadata`: External provider API limits and metadata.
- `pipeline_stage_events`: Granular 10-stage execution telemetry with millisecond durations.
- `notifications`: In-app notification center records with read state and deep links.

## 9. Security Architecture
- **Multi-Tenant Isolation:** Complete cross-user access protection. All queries enforce `WHERE user_id = $1`.
- **AES-256-GCM Vault:** All integration credentials encrypted at rest with 16-byte random IVs and authentication tags.
- **SSRF Validator (`ssrfValidator.js`):** Asynchronous DNS resolution blocking private subnets (`10.x`, `172.16.x`, `192.168.x`), loopback, and cloud metadata (`169.254.169.254`).
- **Zip-Slip Defense (`zipService.js`):** Canonical path validation preventing malicious path traversal sequences in uploaded archives.
- **Webhook Security (`webhookService.js`):** Constant-time HMAC-SHA256 signature verification (`crypto.timingSafeEqual`) and delivery ID idempotency deduplication.
- **Server-Side Secret Redaction (`logStreamingService.js`):** Regex masking sanitizing all logs before persistence or streaming.
- **HTTP Security Headers:** Helmet CSP, X-Frame-Options, X-Content-Type-Options: nosniff.

## 10. Installation
```bash
# Clone the repository
git clone https://github.com/manishvenki/pipelineone-project.git
cd pipelineone-project

# Install root, server, and client dependencies
npm install
npm --prefix server install
npm --prefix client install
```

## 11. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `JWT_SECRET` and `ENCRYPTION_KEY` are generated using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 12. Local Development
```bash
# Start both backend and frontend concurrently
npm run dev

# Or start services individually:
npm --prefix server run dev   # Backend on http://localhost:5000
npm --prefix client run dev   # Frontend on http://localhost:5173
```

## 13. Production Deployment

### Option A: Self-Contained Docker Compose
```bash
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec server npm run migrate
```

### Option B: Decoupled Cloud Deployment
- **Frontend:** Deploy `client` folder to Vercel/Netlify with SPA rewrite fallback (`_redirects` / `vercel.json`).
- **Backend:** Deploy `server` container to a Linux VM/VPS with Docker daemon access.
- **Database:** Managed PostgreSQL 18 instance.

## 14. Screenshots & UI Gallery
- **DevOps Control Center:** Real-time database metrics, active running executions, and quick action cards.
- **10-Stage Pipeline Visualizer:** Interactive connected node progression with live status badges.
- **Live Terminal Console:** Monospaced build streaming terminal with secret redaction verified shield.
- **Deployment Analytics:** Stacked daily frequency charts, circular reliability gauges, and latency metrics.
- **In-App Notification Center:** Dropdown alerts with one-click deep navigation to pipeline runs.

## 15. API Documentation
Key endpoints (all protected endpoints require `Authorization: Bearer <token>`):

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT |
| `GET` | `/api/health` | Public service health check |
| `GET` | `/api/projects` | List user's projects |
| `POST` | `/api/projects/upload-zip` | Upload and extract static website ZIP |
| `POST` | `/api/pipelines/trigger` | Dispatch pipeline execution |
| `GET` | `/api/monitoring/pipelines/:id` | Fetch execution details |
| `GET` | `/api/monitoring/pipelines/:id/stages` | Fetch 10-stage progression state |
| `GET` | `/api/monitoring/pipelines/:id/logs` | Fetch redacted execution logs |
| `GET` | `/api/monitoring/pipelines/:id/stream` | Real-time SSE event stream |
| `GET` | `/api/analytics/overview` | Fetch deployment telemetry & trends |
| `GET` | `/api/notifications` | List user in-app notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read |
| `POST` | `/api/webhooks/github` | GitHub webhook receiver (HMAC verified) |

## 16. Testing & Quality Gates
Execute the comprehensive automated test suite (59 tests across 16 suites):
```bash
npm --prefix server test
```
Build the frontend for production:
```bash
npm --prefix client run build
```

## 17. Known Limitations & Roadmap
- **Supported Workloads:** Optimized specifically for static website projects (HTML, React, Vite, Astro, CRA). Backend microservices or containerized dynamic databases are out of current scope.
- **SSRF Whitelist:** In local development targeting `localhost:8080` Jenkins, `ALLOW_PRIVATE_JENKINS=true` must be set in `.env` to bypass internal IP protections.
- **Future Roadmap:**
  - Automated AWS S3 / Cloudflare Pages deployment targets.
  - Granular webhook event filtering by Git branch pattern.
  - Multi-region pipeline executor workers.

---

## 📄 License
This project is licensed under the MIT License.
