# Pipeline One — In-App Notification Center

## 1. Overview

Pipeline One includes an in-app notification center that alerts developers to pipeline lifecycle transitions in real time. The notification center comprises:
- An unread counter badge on the top navbar bell icon.
- An interactive dropdown card displaying event history.
- Mark single notification or all notifications as read.
- Direct navigation links to the 10-Stage Pipeline Visualizer for the associated execution.

---

## 2. Notification Types & Triggers

The orchestrator (`pipelineOrchestrator.js`) automatically publishes notifications during execution milestones:

| Notification Type | Trigger Event | Icon | Severity |
|---|---|---|---|
| `pipeline_started` | Pipeline execution initiated via webhook or manual trigger | PlayCircle (Blue) | Info |
| `build_success` | Static framework build and artifact validation succeeded | CheckCircle2 (Emerald) | Success |
| `build_failed` | Build command failed or exit code was non-zero | XCircle (Rose) | Error |
| `docker_publish` | Container image built and pushed to Docker Hub registry | Box (Sky) | Info |
| `vercel_ready` | Static site uploaded and verified on Vercel edge network | ExternalLink (Purple) | Success |
| `pipeline_failed` | Any stage incurred an unrecoverable failure | XCircle (Rose) | Error |
| `pipeline_cancelled` | User manually stopped the pipeline execution | AlertTriangle (Amber) | Warning |

---

## 3. Endpoints

All notification endpoints require JWT application authentication (`requireAuth`):

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/notifications` | `GET` | List notifications for authenticated user (supports `limit` and `offset`) |
| `GET /api/notifications/unread-count` | `GET` | Return `{ unreadCount: n }` for badge display |
| `PATCH /api/notifications/:id/read` | `PATCH` | Mark a specific notification as read (`is_read: true`) |
| `PATCH /api/notifications/read-all` | `PATCH` | Mark all notifications for current user as read |

---

## 4. Polling & Sync Behavior
- The `NotificationBell` component checks `/api/notifications/unread-count` every 15 seconds.
- Opening the dropdown fetches the latest 15 notifications.
- Clicking any notification marks it read immediately and navigates to `/dashboard/pipelines/:execution_id`.
