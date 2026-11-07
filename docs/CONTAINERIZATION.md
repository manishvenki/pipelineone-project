# Docker Containerization Engine Architecture

Pipeline One includes an integrated containerization engine designed specifically for static websites, single-page applications, and modern frontend frameworks.

---

## 1. Engine Objectives & Philosophy

- **Zero Handcrafted Dockerfiles Required:** Developers do not need Docker knowledge; the engine detects project types and dynamically generates optimal Dockerfiles.
- **Minimal Attack Surface:** Runtime containers use Alpine-based minimal Nginx (`nginx:alpine-slim`), completely eliminating Node.js, npm, git, or build tools from production images.
- **Production Performance:** Nginx is pre-configured with gzip compression, security headers (`X-Frame-Options`, `X-Content-Type-Options`), browser caching for static assets, and client-side SPA routing (`try_files $uri $uri/ /index.html`).
- **Safe Subprocess Execution:** Builds are executed using parameterized `child_process.spawn('docker', args)` with isolated process groups, enforcing strict execution timeouts and immediate signal termination.

---

## 2. Supported Project Types

### 1. Pure HTML / CSS / JavaScript
- **Detector:** Absence of `package.json`, presence of `index.html`.
- **Dockerfile Architecture:** Single-stage minimal Nginx:
  ```dockerfile
  FROM nginx:alpine-slim
  COPY . /usr/share/nginx/html/
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```

### 2. React + Vite / Modern Bundlers
- **Detector:** `package.json` with dependencies or devDependencies matching `vite`, `react`, `@vitejs/plugin-react`.
- **Dockerfile Architecture:** Multi-stage build:
  - **Stage 1 (Builder):** `node:20-alpine`. Copies lockfiles first (`package-lock.json` or `pnpm-lock.yaml` or `yarn.lock`) to leverage Docker layer caching, executes clean install (`npm ci` or `npm install`), and runs the detected build command (`npm run build`).
  - **Stage 2 (Production Runner):** `nginx:alpine-slim`. Copies only the compiled output directory (e.g., `/dist` or `/build`) into `/usr/share/nginx/html/`.
  - Result: Production image size is reduced from >600MB down to ~25MB.

---

## 3. Subprocess Execution & Safety Controls

The build engine (`server/src/services/dockerBuildService.js`) enforces:

1. **Parameter Sanitization:** Commands are never passed to raw shell interpreters (`shell: false`). Arguments are strictly passed as typed arrays to `spawn('docker', args)`.
2. **Timeout Enforcement:** Builds are governed by a configurable timeout (default: 10 minutes / 600,000ms). Processes exceeding this limit receive `SIGTERM` followed by `SIGKILL`.
3. **Log Bounded Buffering:**
   - In-memory circular buffer retains the latest 1,000 lines.
   - Complete build transcripts are written to persistent bounded log files at `storage/build-logs/<build_id>.log`.
4. **Build Cancellation:** Users can abort in-progress builds via `POST /api/docker/builds/:id/cancel`, which terminates the spawned child process tree and logs the cancellation event.

---

## 4. Real-Time Log Streaming via Server-Sent Events (SSE)

Real-time build logs are streamed to the frontend build console using standard Server-Sent Events:

- **Endpoint:** `GET /api/docker/builds/:id/events`
- **Authentication:** Standard Bearer token in `Authorization` header, HttpOnly cookie, or `?token=<jwt>` query parameter.
- **Event Types:**
  - `event: initial_log`: Replays all historical lines logged prior to connection.
  - `event: log`: Emits each new stdout or stderr line as it arrives from the Docker subprocess.
  - `event: status`: Emits state transitions (`queued` -> `in_progress` -> `completed` / `failed` / `cancelled`).

---

## 5. Docker Hub Publishing Lifecycle

When a build request sets `pushToDockerHub: true`:
1. The engine checks if the user has an active Docker Hub integration in `connected_integrations`.
2. The PAT is decrypted from the credential vault.
3. The engine authenticates the local Docker CLI using secure non-interactive input:
   ```bash
   docker login --username <username> --password-stdin
   ```
4. The image is tagged:
   ```bash
   docker tag <local_image_name>:<tag> <destination_repo>:<tag>
   ```
5. The image is pushed:
   ```bash
   docker push <destination_repo>:<tag>
   ```
6. The CLI session is logged out cleanly (`docker logout`), ensuring credentials do not linger on the host.
7. Image metadata is persisted in `docker_images`.

