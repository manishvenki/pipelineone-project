# Pipeline One — Real-Time Monitoring & Visualization Architecture

## 1. Overview

Phase 4 transforms Pipeline One into a unified, real-time DevOps monitoring and visualization platform. The monitoring engine delivers real-time telemetry across Jenkins CI orchestration, Docker image containerization, and Vercel edge deployments directly to the browser without requiring external dashboard toggling.

```
       +---------------------------------------------+
       |           Client Web Application            |
       |  (10-Stage Visualizer, Terminal Console,    |
       |   Analytics Charts, Notification Bell)      |
       +---------------------------------------------+
               ^                       ^
       SSE Stream                      REST APIs
  (/api/monitoring/.../stream)    (/api/dashboard/overview,
                                   /api/analytics/overview,
                                   /api/notifications)
               |                       |
       +---------------------------------------------+
       |          Pipeline One Node.js Backend       |
       |  - logStreamingService (Secret Redaction)   |
       |  - monitoringService (Stages & Aggregation) |
       |  - analyticsService (Trends & Durations)    |
       |  - notificationService (In-App Alerts)      |
       |  - pipelineStatusService (Event Pub/Sub)    |
       +---------------------------------------------+
                               |
       +---------------------------------------------+
       |           PostgreSQL 18 Database            |
       |  - pipeline_stage_events (10 stages)        |
       |  - pipeline_executions & logs               |
       |  - notifications (in-app center)            |
       |  - projects, integrations, docker_builds    |
       +---------------------------------------------+
```

---

## 2. Database Schema Additions (Phase 4 Migration)

Phase 4 introduced two dedicated database relations:

### 2.1 `pipeline_stage_events`
Tracks granular lifecycle metrics for each of the 10 canonical pipeline stages per execution:

```sql
CREATE TABLE IF NOT EXISTS pipeline_stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES pipeline_executions(id) ON DELETE CASCADE,
  stage_name VARCHAR(60) NOT NULL,
  stage_status VARCHAR(30) NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stage_events_exec ON pipeline_stage_events(execution_id);
```

### 2.2 `notifications`
Powers the real-time notification bell and event dispatching:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES pipeline_executions(id) ON DELETE SET NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
```

---

## 3. Real-Time Event Streaming (Server-Sent Events)

### 3.1 Event Streaming Protocol
- **Endpoint:** `GET /api/monitoring/pipelines/:id/stream`
- **Protocol:** HTTP/1.1 Server-Sent Events (SSE) with `text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- **Heartbeat:** Periodic ping comments (`: ping\n\n`) every 15 seconds prevent reverse proxies and browsers from terminating idle TCP sockets.
- **Reconnection:** If connection drops, the browser `EventSource` automatically reconnects. The server sends persisted stage state and backlogged logs before subscribing to live broadcasts.

### 3.2 State Recovery on Refresh
All stage transitions, log entries, and durations are persisted directly to PostgreSQL. When a user navigates to `/dashboard/pipelines/:id` or refreshes their browser:
1. `GET /api/monitoring/pipelines/:id` recovers top-level execution metadata, commit info, Docker artifacts, and live URLs.
2. `GET /api/monitoring/pipelines/:id/stages` reconstructs the 10-stage progression state.
3. `GET /api/monitoring/pipelines/:id/logs` returns historical logs with all secrets pre-redacted.
4. If the execution is still active, an SSE connection is initialized for live incremental updates.

---

## 4. Scalability & Graceful Degradation
- **Polling Fallback:** In environments where SSE connections cannot be maintained, components safely fall back to periodic interval polling.
- **In-Memory Pub/Sub:** Uses Node.js `EventEmitter` with listener cleanup on SSE disconnect (`req.on('close')`), eliminating memory leaks.

