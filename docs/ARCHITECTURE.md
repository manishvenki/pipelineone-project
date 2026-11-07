# Pipeline One — Architecture & System Design

## 1. High-Level Architecture Overview

Pipeline One is a lightweight DevOps automation platform designed primarily for static website projects. The application follows a modern decoupled client-server architecture with hybrid data persistence:

```
┌────────────────────────────────────────────────────────┐
│             React / Vite Frontend (SPA)                │
│    Tailwind CSS, Lucide Icons, Dark SaaS Interface     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST / Cookies
                           ▼
┌────────────────────────────────────────────────────────┐
│            Node.js / Express Backend API               │
│  ├── JWT Authentication & Rate Limiting                │
│  ├── AES-256-GCM Encryption Vault                      │
│  ├── Anti-ZipSlip Extraction & Heuristics Service      │
│  └── GitHub OAuth v3 / REST Service                    │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌──────────────────────────────┐  ┌──────────────────────┐
│    PostgreSQL (Primary)      │  │ MongoDB Atlas (Doc)  │
│ - users                      │  │ - flexible scan ASTs │
│ - connected_integrations     │  │ - raw project logs   │
│ - projects                   │  └──────────────────────┘
│ - project_repositories       │
│ - user_settings              │
│ - activity_records           │
└──────────────────────────────┘
```

---

## 2. Security Model

1. **Credential Vault**:
   - External OAuth tokens and Personal Access Tokens are encrypted with **AES-256-GCM** before persistence.
   - Decryption occurs strictly within backend memory and decrypted secrets are never transmitted to the frontend.

2. **Authentication**:
   - Password hashing with **bcryptjs** (12 salt rounds).
   - Session identification using signed **JWT** with configurable expiration.
   - Transported via **HttpOnly SameSite cookies** and Bearer Authorization headers.

3. **OAuth Flow & CSRF Defense**:
   - OAuth `state` parameter is generated cryptographically using `HMAC-SHA256(userId + randomBytes + timestamp, JWT_SECRET)`.
   - On GitHub callback, the HMAC signature and maximum lifetime (15 minutes) are verified before token exchange.

4. **Archive Security (Anti-ZipSlip & Bomb Mitigation)**:
   - File traversal characters (`..`, `/`, `\`) are strictly detected and rejected.
   - Uncompressed size limit enforced at 150MB.
   - Maximum entry count capped at 3,000 files.

---

## 3. Database Persistence Design

### PostgreSQL (Primary Relational Store)
- **`users`**: User identity, hashed passwords, profile details.
- **`connected_integrations`**: Integration credentials, encrypted tokens, provider metadata.
- **`projects`**: Project identity, detected framework, build commands, output directory.
- **`project_repositories`**: GitHub repository reference, branch tracking, commit SHAs.
- **`user_settings`**: User dashboard preferences and deployment triggers.
- **`activity_records`**: Complete user audit timeline.

### Operational Resiliency (Dual-Mode DB Adapter)
If PostgreSQL is temporarily unavailable during local testing or evaluation, the backend activates a built-in embedded compatibility layer with zero data loss during runtime, ensuring uninterrupted development and testing.

### MongoDB Atlas (Secondary Document Store)
Provides scalable document storage for deep AST analysis, file tree matrices, and build logs without bloating relational tables.
