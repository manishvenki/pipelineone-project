# Pipeline One — Real-Time Events & 10 Canonical Stages

## 1. The 10 Canonical Pipeline Stages

Pipeline One formalizes CI/CD execution into 10 ordered canonical stages. Each stage represents a discrete, observable operational milestone:

| # | Stage Key | Title | Description | Optional? |
|---|---|---|---|---|
| 1 | `github_source` | GitHub Source | Webhook payload received or manual trigger initiated | No |
| 2 | `jenkins_queue` | Jenkins Queue | Job parameterized, queued, and worker node allocated | No |
| 3 | `source_checkout` | Source Checkout | Git repository cloned and commit SHA checked out | No |
| 4 | `installing_dependencies` | Dependencies | `npm install` / dependency resolution | No |
| 5 | `build` | Static Build | Static framework build (`npm run build`, Astro, Vite) | No |
| 6 | `static_output_validation` | Validation | Verification of `index.html` and non-empty output directory | No |
| 7 | `docker_build` | Docker Build | Container image built with multi-stage Dockerfile | Yes |
| 8 | `docker_hub_publish` | Docker Publish | Tagged container image pushed to Docker Hub registry | Yes |
| 9 | `vercel_deployment` | Vercel Deploy | Static assets uploaded and deployed to Vercel edge | No |
| 10 | `deployment_verification` | Verification | HTTP GET verification of the live deployment URL | No |

---

## 2. Stage Status Lifecycle

Each stage transitions through strict valid states:

- `waiting`: Upstream stage has not yet started or completed.
- `queued`: Stage is queued awaiting node or API resource availability.
- `running`: Stage is actively executing.
- `completed`: Stage completed successfully with measured `duration_ms`.
- `failed`: Stage threw an error or exited with non-zero code. An `error_message` is recorded.
- `skipped`: Stage was intentionally bypassed (e.g., Docker disabled in pipeline configuration). Skipped stages do not fail the pipeline.
- `cancelled`: Execution was explicitly cancelled by the user.

---

## 3. SSE Event Payloads

### 3.1 Initial State (`eventType: "initial_state"`)
Sent immediately when the SSE connection opens:

```json
{
  "eventType": "initial_state",
  "executionId": "b182cb08-0bf4-4f0f-89b3-4f24ef78c85c",
  "status": "running",
  "stages": [
    { "stage_name": "github_source", "stage_status": "completed", "duration_ms": 120 },
    { "stage_name": "jenkins_queue", "stage_status": "completed", "duration_ms": 450 },
    { "stage_name": "source_checkout", "stage_status": "running", "duration_ms": 0 }
  ]
}
```

### 3.2 Stage Transition (`eventType: "stage_transition"`)
Broadcasted on stage state changes:

```json
{
  "eventType": "stage_transition",
  "executionId": "b182cb08-0bf4-4f0f-89b3-4f24ef78c85c",
  "stage": "build",
  "status": "completed",
  "duration_ms": 14250,
  "details": { "framework": "react_vite", "output_dir": "dist" }
}
```

### 3.3 Log Line (`eventType: "log"`)
Broadcasted when standard output or standard error produces output:

```json
{
  "eventType": "log",
  "executionId": "b182cb08-0bf4-4f0f-89b3-4f24ef78c85c",
  "stage": "build",
  "level": "INFO",
  "message": "vite v6.4.5 building for production... ✓ 1696 modules transformed.",
  "timestamp": "14:40:22"
}
```

### 3.4 Terminal Events (`eventType: "pipeline_success"` / `eventType: "pipeline_failed"`)
Broadcasted when pipeline execution terminates:

```json
{
  "eventType": "pipeline_success",
  "executionId": "b182cb08-0bf4-4f0f-89b3-4f24ef78c85c",
  "live_url": "https://my-static-project-ten.vercel.app",
  "duration_ms": 32180
}
```
