# Pipeline One 🚀
### Modern DevOps Automation Platform for Static Website Projects

> **"From Repository to Deployment. Simplified."**

Pipeline One is a lightweight DevOps automation platform designed primarily for static website projects. It bridges the gap between source code repositories (GitHub, local archives) and cloud deployment pipelines through intelligent static project detection, encrypted credential vaults, and automated CI/CD readiness.

---

## 📌 Phase 1 Status: Complete (Phase 1 of 5)

Phase 1 delivers the foundational application architecture and real GitHub integration:
- 🛡️ **Production-Grade Security**: Bcrypt password hashing, JWT HttpOnly cookies, AES-256-GCM encrypted token vault, rate limiting, and Zip-Slip prevention.
- 🗄️ **Dual-Mode Data Architecture**: Relational PostgreSQL schema (Users, Integrations, Projects, Repositories, Settings, Activity) with resilient local fallback mode, plus secondary MongoDB Atlas cloud document support.
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
| **Databases** | PostgreSQL (Primary Relational), MongoDB Atlas (Secondary Document Store) |
| **Security** | AES-256-GCM Cryptographic Vault, Helmet, Express Rate Limit, Zod Validation |
| **Tooling** | Concurrently, Git, Node Native Test Runner |

---

## 📂 Project Structure

```
PipelineOne/
├── client/                     # Frontend SPA (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Reusable UI & modal components
│   │   │   ├── common/         # Navbar, Sidebar, Modal, Badge
│   │   │   ├── integrations/   # ConnectGitHubModal, IntegrationCards
│   │   │   └── projects/       # RepoSelectorModal, UploadZipModal
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── layouts/            # DashboardLayout
│   │   ├── pages/              # LandingPage, Login, Register, Dashboard, Projects, Settings, Activity
│   │   ├── services/           # api, authService, githubService, projectService
│   │   ├── App.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                     # Backend REST API (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Database pool & resilient store, MongoDB Atlas, env
│   │   ├── controllers/        # Auth, GitHub, Projects, Health
│   │   ├── database/           # PostgreSQL schema.sql and migrations
│   │   ├── middleware/         # Auth, Upload/Multer, RateLimiter, ErrorHandler
│   │   ├── models/             # Relational & MongoDB models
│   │   ├── routes/             # authRoutes, githubRoutes, projectRoutes, healthRoutes
│   │   ├── services/           # authService, githubService, projectDetectionService, zipService, security
│   │   ├── utils/              # logger, security, validators
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/                  # Automated integration & unit tests
│   ├── storage/                # Safe project workspace directory
│   └── uploads/                # Temporary upload staging
│
├── docs/                       # Comprehensive documentation
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

### 1. Clone & Configure Environment
```bash
cp .env.example .env
```
*(The default `.env` is pre-configured to run out-of-the-box in local development with fallback resilient storage!)*

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

---

## 🧪 Automated Testing

Run the automated backend test suite (12 unit and integration tests):
```bash
npm run test
```

Tests cover:
- Health check verification
- User registration, duplicate detection, and login validation
- JWT generation and cookie handling
- AES-256-GCM token encryption and decryption
- Password hashing with Bcrypt
- OAuth state HMAC generation and expiration
- Static project framework detection (HTML, Vite/React, CRA, Astro)
- Direct ZIP archive safe extraction & analysis
- Zip Slip path traversal security defense

---

## 🔑 GitHub Connection Guide

Pipeline One supports two options for GitHub:
1. **OAuth 2.0 (Production)**: Configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`.
2. **Personal Access Token (Development/Evaluation)**: Open **Integrations** > **Connect GitHub** in the dashboard and paste a classic or fine-grained GitHub token with `repo` and `read:user` permissions.

See [docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md) for full instructions.

---

## 🗺️ Roadmap (5 Phases)

- [x] **Phase 1: Foundation, Application Architecture & GitHub Integration** *(Completed)*
- [ ] **Phase 2: Docker Hub Integration & Containerization Engine**
- [ ] **Phase 3: Jenkins Automated CI/CD Pipeline Orchestration**
- [ ] **Phase 4: Vercel Edge Deployment & Multi-Target Delivery**
- [ ] **Phase 5: Production Hardening, Monitoring & Telemetry**

---

## 📄 License
MIT License. Built for the Pipeline One DevOps Platform.
