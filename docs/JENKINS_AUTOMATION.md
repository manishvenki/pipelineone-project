# Pipeline One — Jenkins CI Automation & Job Engine

## 1. Overview

Pipeline One automates continuous integration workflows on Jenkins without requiring manual pipeline creation in the Jenkins web UI. The platform dynamically generates declarative Jenkinsfiles tailored to each project's static framework, provisions `WorkflowJob` pipelines via REST API, and controls the build lifecycle.

---

## 2. Dynamic Declarative Jenkinsfile Generation

The generator (`server/src/services/pipeline/jenkinsfileGenerator.js`) dynamically builds standard Jenkins declarative syntax based on static detection analysis:

### Pure Static HTML/CSS/JS Pipeline:
- **Environment:** Lightweight Node/Alpine image or agent.
- **Stage: Checkout:** Checks out branch from GitHub using Jenkins credentials.
- **Stage: Validate Static Assets:** Verifies `index.html` exists and HTML structure is valid.
- **Stage: Optional Docker Build:** Triggers Docker build and push if enabled in project config.
- **Stage: Deploy to Vercel:** Packages output directory and triggers edge deployment.
- **Stage: Health Probe:** Validates HTTP 200 response on generated URL.

### React + Vite Static Project Pipeline:
- **Environment:** Node 18 or 20 LTS agent.
- **Stage: Checkout:** Git SCM checkout.
- **Stage: Install Dependencies:** Runs `npm ci` or `npm install`.
- **Stage: Build & Bundle:** Runs `npm run build` (or custom build command).
- **Stage: Validate Build Artifacts:** Asserts output directory (`dist`) contains `index.html` and bundled assets.
- **Stage: Optional Docker Build:** Nginx multi-stage build & push.
- **Stage: Deploy to Vercel:** Deploys `dist` directly to Vercel.
- **Stage: Health Check:** Probes deployment URL.

---

## 3. Jenkins REST API Automation

Pipeline One manages Jenkins through standard REST endpoints using API tokens:

### 1. CSRF Crumb Management
Jenkins instances with CSRF protection enabled require an active crumb:
```http
GET /crumbIssuer/api/json
```
Header returned: `Jenkins-Crumb: <token>`. Pipeline One attaches this header to all mutating POST requests.

### 2. Programmatic Job Creation / Update
The engine generates standard Jenkins `WorkflowJob` XML (`config.xml`) enclosing the generated pipeline script:
- If job does not exist:
  ```http
  POST /createItem?name=<jobName>
  Content-Type: application/xml
  ```
- If job already exists:
  ```http
  POST /job/<jobName>/config.xml
  Content-Type: application/xml
  ```

### 3. Build Trigger & Queue Resolution
Triggers build execution:
```http
POST /job/<jobName>/buildWithParameters
```
The Jenkins API returns a queue item URL in the `Location` header (e.g., `/queue/item/42/`). Pipeline One queries `/queue/item/42/api/json` until `executable.number` is assigned, resolving the queue item to a concrete build number.

### 4. Build Status & Progressive Console Logs
- **Status:** Polled via `GET /job/<jobName>/<buildNumber>/api/json` (`result`: `SUCCESS`, `FAILURE`, `ABORTED`, `null` if in progress).
- **Console Output:** Retrieved via `GET /job/<jobName>/<buildNumber>/logText/progressiveText?start=0`.

### 5. Build Abort / Cancellation
When a user clicks "Cancel" in Pipeline One, the engine sends:
```http
POST /job/<jobName>/<buildNumber>/stop
```

---

## 4. Security & Isolation

- All Jenkins passwords are rejected; **only Personal Access Tokens (API tokens) are accepted**.
- Stored credentials are encrypted using **AES-256-GCM** in PostgreSQL.
- All Jenkins server URLs pass through SSRF validation to block loopbacks and AWS/cloud metadata services (`169.254.169.254`).
