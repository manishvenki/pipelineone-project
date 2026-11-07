# Pipeline One 🚀
### Modern DevOps Automation Platform for Static Website Projects

> **"From Repository to Deployment. Simplified."**

Pipeline One is a lightweight DevOps automation platform designed primarily for static website projects. It bridges the gap between source code repositories (GitHub, local archives) and cloud deployment pipelines through intelligent static project detection, encrypted credential vaults, multi-stage Docker containerization, and automated CI/CD readiness.

---

## 📌 Development Status: Phase 3 Complete (3 of 5 Phases)

- [x] **Phase 1: Foundation, Application Architecture & GitHub Integration** *(Completed)*
- [x] **Phase 2: Real Platform Integrations (Docker Hub, Jenkins, Vercel) & Containerization Engine** *(Completed)*
- [x] **Phase 3: Automated CI/CD Pipeline Orchestration Engine** *(Completed)*
- [ ] **Phase 4: Advanced Edge Deployments & Multi-Target Routing**
- [ ] **Phase 5: Production Hardening, Monitoring & Telemetry**

---

## 🌟 Key Capabilities

### Phase 3 CI/CD Pipeline Orchestration Engine
- 🤖 **Dynamic Declarative Jenkinsfile Generator**: Framework-aware Jenkinsfiles generated dynamically for Pure HTML and React/Vite with stage validation, credential masking, and post-build actions.
- 🏗️ **Jenkins Job Automation**: Programmatic `WorkflowJob` `config.xml` creation and updates, CSRF crumb management, queue item resolution, and console text streaming.
- 🎣 **Secure GitHub Webhook Ingestion**: Constant-time HMAC-SHA256 signature verification (`X-Hub-Signature-256`), delivery ID idempotency deduplication (`X-GitHub-Delivery`), and automatic build triggering on `git push`.
- ▲ **Automated Vercel Edge Deployment**: Recursive static asset SHA-1 hashing, direct upload via `/v2/files`, and deployment creation via `/v13/deployments`.
- 🩺 **Automated Health Probing**: Polling until `READY`, followed by HTTP GET health checks and response latency benchmarking.
- 📺 **Real-Time CI/CD Deployments Console**: Full frontend management console with visual stage progression (`StageProgressionBar`), live SSE log streaming, cancellation, and traceable retries.

### Phase 2 DevOps Integrations & Container Engine
- 🐳 **Docker Hub Integration**: Authenticate via username + PAT, explore repositories and tags, inspect image download counts, and securely publish tagged images.
- 🏗️ **Jenkins Server Integration**: Connect via HTTP Basic Auth (username + API Token), strict Server-Side Request Forgery (SSRF) defense blocking private subnets and cloud metadata IPs, CSRF crumb tracking, and job tree status monitoring.
- ▲ **Vercel Platform Integration**: Dual-mode connection (OAuth 2.0 & Personal Access Token), personal/team project enumeration, and deployment target linking.
- 📦 **Docker Containerization Engine**: Multi-stage Dockerfile generator producing production-optimized `nginx:alpine-slim` containers (reducing image size from >600MB down to ~25MB), safe `spawn('docker', args)` subprocess execution, 10-minute timeout guard, and cancellation handling.
- 📡 **Real-Time Build Console**: Server-Sent Events (SSE) live streaming (`GET /api/docker/builds/:id/events`), bounded persistent disk logging, terminal auto-scrolling, and copy log buffer.
- 🧙 **Guided Onboarding Wizard**: Step-by-step setup flow guiding users through connecting GitHub, Docker Hub, Jenkins, and Vercel.

### Phase 1 Foundation
- 🛡️ **Production-Grade Security**: Bcrypt password hashing, JWT HttpOnly cookies, AES-256-GCM encrypted token vault, rate limiting, and Zip-Slip prevention.
- 🗄️ **Dual-Mode Data Architecture**: Relational PostgreSQL schema (14 tables) with resilient local fallback mode, plus secondary MongoDB Atlas cloud document support.
- 🐙 **Real GitHub Integration**: Full OAuth 2.0 authorization with cryptographically signed HMAC state validation, plus alternative Personal Access Token (PAT) connection. Live repository browsing, branch selection, root directory inspection, and project tracking.
- 📦 **Direct Project ZIP Upload**: Secure drag-and-drop archive upload, Zip-Slip vulnerability prevention, and directory tree inspection independent of GitHub.
- 🔍 **Static Project Heuristics Engine**: Automatic detection of HTML/CSS/JS, Vite + React, Astro, Create React App, and build configuration analysis (`dist`, `build`, scripts).
- 💻 **Dark-First SaaS UI**: Professional DevOps dashboard built with React 18, Vite, Tailwind CSS, Lucide icons, and responsive layouts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, JavaScript, Tailwind CSS, React Router v6, Lucide React Icons |
| **Backend** | Node.js (v20), Express.js, REST APIs, JWT, Bcrypt, Multer, Adm-Zip, Axios |
| **Databases** | PostgreSQL 18 (Primary Relational), MongoDB Atlas (Secondary Document Store) |
| **Containerization** | Docker Engine CLI, Multi-stage Nginx Alpine & Node Alpine images |
| **Security** | AES-256-GCM Vault, SSRF DNS Validator, Helmet, Express Rate Limit, Zod Validation |
| **Tooling** | Concurrently, Git, Node Native Test Runner |

---

## 📂 Project Structure

```
PipelineOne/
├── client/                     # Frontend SPA (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Reusable UI & modal components
│   │   │   ├── common/         # Navbar, Sidebar, Modal, Badge
│   │   │   ├── integrations/   # ConnectGitHub, DockerHub, Jenkins, Vercel, Wizard, Details
│   │   │   ├── builds/         # DockerBuildModal
│   │   │   └── projects/       # RepoSelectorModal, UploadZipModal
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── layouts/            # DashboardLayout
│   │   ├── pages/              # Landing, Login, Register, Dashboard, Projects, Builds, Integrations, Settings
│   │   ├── services/           # api, authService, githubService, projectService, integrationService
│   │   ├── App.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                     # Backend REST API (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Database pool & resilient store, MongoDB Atlas, env
│   │   ├── controllers/        # Auth, GitHub, DockerHub, Jenkins, Vercel, DockerBuild, Projects, Health
│   │   ├── database/           # PostgreSQL schema.sql and phase2_migration.sql
│   │   ├── middleware/         # Auth, Upload/Multer, RateLimiter, ErrorHandler
│   │   ├── models/             # Relational & MongoDB models
│   │   ├── routes/             # auth, github, dockerHub, jenkins, vercel, dockerBuild, project, integration
│   │   ├── services/           # dockerBuild, dockerHub, jenkins, vercel, dockerfileGenerator, security
│   │   ├── utils/              # ssrfValidator, logger, security, validators
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/                  # Automated integration & unit tests (26 passing)
│   ├── storage/                # Safe project workspace & build-logs directory
│   └── uploads/                # Temporary upload staging
│
├── docs/                       # Comprehensive documentation
│   ├── PHASE_2_REPORT.md       # Evidence-based completion report for Phase 2
│   ├── PHASE_3_REPORT.md       # Comprehensive Phase 3 completion report
│   ├── PIPELINE_ORCHESTRATION.md # Full orchestration engine architecture & state machine
│   ├── JENKINS_AUTOMATION.md   # Dynamic Jenkinsfile & WorkflowJob REST API automation
│   ├── GITHUB_WEBHOOKS.md      # Webhook ingestion, HMAC-SHA256 & idempotency
│   ├── VERCEL_DEPLOYMENT.md    # Direct static asset packaging & edge deployment
│   ├── PIPELINE_CONFIGURATION.md # CI/CD configuration schema & defaults
│   ├── PIPELINE_SECURITY.md    # Security controls, encryption & process isolation
│   ├── PHASE_2_REPORT.md       # Evidence-based completion report for Phase 2
│   ├── DOCKER_SETUP.md         # Docker engine prerequisites and daemon troubleshooting
│   ├── DOCKERHUB_INTEGRATION.md # Docker Hub PAT generation, AES-256-GCM vault, publishing
│   ├── JENKINS_SETUP.md        # Jenkins API tokens, SSRF security, CSRF crumbs, job tree
│   ├── VERCEL_INTEGRATION.md   # Vercel OAuth & PAT integration and deployment targets
│   ├── CONTAINERIZATION.md     # Multi-stage Dockerfile architecture, SSE streaming, timeouts
│   ├── ARCHITECTURE.md         # System architecture & component diagram
│   ├── API.md                  # REST API endpoints & schemas
│   ├── GITHUB_SETUP.md         # GitHub OAuth App and PAT configuration guide
│   ├── DATABASE_SETUP.md       # PostgreSQL & MongoDB Atlas instructions
│   └── SECURITY.md             # Cryptography & vulnerability mitigation
│
├── .env.example                # Environment configuration template
├── .gitignore                  # Git exclusions
├── package.json                # Root workspace runner
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker Desktop or Linux Docker Engine (optional, needed for local container builds)

### 1. Clone & Configure Environment
```bash
cp .env.example .env
```

### 2. Install Dependencies
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 3. Run Backend & Frontend Concurrently
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Docker Engine Check**: [http://localhost:5000/api/docker/engine](http://localhost:5000/api/docker/engine)

---

## 🧪 Automated Testing

Run the full automated test suite (26 passing tests across 5 test suites):
```bash
npm run test
```

Test coverage includes:
- Health check & database connection
- User authentication, JWT, bcrypt hashing, and password salting
- AES-256-GCM cryptographic encryption and decryption
- SSRF IP validation (loopback, RFC 1918 subnets, cloud metadata IPs, protocol rejection)
- Multi-stage Dockerfile generation for HTML & React/Vite
- Docker CLI & daemon status checks
- Docker Hub, Jenkins, and Vercel connection schema validations
- Unified multi-provider integration status aggregation
- Safe project archive unpacking & Zip Slip rejection

---

## 📄 License
MIT License. Built for the Pipeline One DevOps Platform.
