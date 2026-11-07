# Pipeline One — CI/CD Pipeline Orchestration Engine

## 1. Overview

Pipeline One features an automated continuous delivery orchestration engine engineered specifically for static web applications (HTML5/CSS/JavaScript and React/Vite). The orchestrator bridges source version control (GitHub), continuous integration automation (Jenkins), optional containerization (Docker Hub), and global edge distribution (Vercel).

The engine operates autonomously without requiring developers to manually write pipeline scripts or configure CI servers for each repository.

---

## 2. Orchestration Architecture

```
                       [ GitHub Repository ]
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
   Manual UI Trigger                          GitHub Webhook Push
   (POST /api/pipelines/trigger)              (POST /api/webhooks/github)
           │                                           │
           └─────────────────────┬─────────────────────┘
                                 │
                                 ▼
                     [ Pipeline Orchestrator ]
                     (pipelineOrchestrator.js)
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
 [ Jenkins CI Agent ]   [ Local Runner ]        [ Docker Engine ]
 (Remote config.xml &   (Isolated sandbox       (Optional Nginx
  dynamic Jenkinsfile)   worker execution)       container build)
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
                    [ Vercel Edge Deployment ]
                    (Direct static asset push
                     via /v13/deployments)
                                 │
                                 ▼
                 [ Live Verification & Health Probe ]
                 (HTTP GET probe, latency measurement)
                                 │
                                 ▼
                    [ Live Production URL ]
                    (Persisted in DB & SSE streamed)
```

---

## 3. Execution State Machine

Every pipeline execution transitions through a deterministic, auditable state machine:

| Stage Key | Name | Description |
|---|---|---|
| `pending` | Pending | Execution created in database; resources being allocated. |
| `queued` | Queued | Enqueued for runner execution or Jenkins build queue. |
| `checking_source` | Validating Source | Repository metadata, branch existence, and commit SHA resolved. |
| `checkout` | Source Checkout | Code pulled to isolated build workspace. |
| `installing_dependencies` | Dependency Installation | Running `npm install` / `ci` (skipped for pure static HTML). |
| `building` | Asset Compilation | Executing build script (e.g., `npm run build` with Vite). |
| `validating_output` | Output Validation | Verifying output directory exists, has files, and contains `index.html`. |
| `docker_building` | Containerization (Optional) | Building Docker image and publishing to Docker Hub if configured. |
| `deploying` | Vercel Deployment | Uploading static assets and generating Vercel edge deployment. |
| `verifying_deployment` | Live Verification | Polling deployment status until `READY` and health probing URL. |
| `success` | Succeeded | Deployment live, URL verified, metrics recorded. |
| `failed` | Failed | Execution aborted due to an error; failure captured in audit log. |
| `cancelled` | Cancelled | Execution stopped gracefully by user request. |

---

## 4. Dual Execution Model: Jenkins vs. Local Isolation

1. **Jenkins Remote Delegation:**
   - If the user has configured and verified a Jenkins integration, the orchestrator creates/updates a Jenkins `WorkflowJob` using `jenkinsJobService.js`, generates a dynamic declarative Jenkinsfile via `jenkinsfileGenerator.js`, and triggers the remote build via Jenkins REST API.
   - The engine polls queue items, monitors build status, streams console logs, and tracks completion.
2. **Local Runner Isolation:**
   - If Jenkins is not connected or reachable, the orchestrator falls back to its built-in local execution engine (`runLocalPipeline`).
   - The runner executes commands in an isolated temporary directory with timeouts (30s per command guard), catches errors, and logs every step into `pipeline_events`.

---

## 5. Real-Time State & Log Streaming (SSE)

Clients subscribe to real-time events via Server-Sent Events (SSE):

```http
GET /api/pipelines/executions/:id/events
Authorization: Bearer <jwt_token>
```

Event stream types:
- `stage_change`: Emits when the pipeline transitions to a new state (`{ status, stage, timestamp }`).
- `log`: Emits individual stdout/stderr lines with timestamps and log levels.
- `done`: Emits final execution result, duration, and live URL.

---

## 6. Cancellation & Traceable Retries

- **Graceful Cancellation (`POST /api/pipelines/executions/:id/cancel`):**
  Sets status to `cancelled`, terminates running processes, and aborts any active Jenkins build via Jenkins API. The orchestrator checks cancellation flags before each stage transition to prevent state overwrites.
- **Traceable Retries (`POST /api/pipelines/executions/:id/retry`):**
  Creates a new execution record with `trigger_source = 'retry'`, copying the commit context, branch, and configuration from the original run. Both runs remain fully audited in PostgreSQL.
