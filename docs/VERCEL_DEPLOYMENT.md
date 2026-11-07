# Pipeline One — Vercel Automated Static Deployment

## 1. Overview

Pipeline One provides automated direct static site deployment to the Vercel Edge Network. Unlike traditional approaches that run full builds on Vercel servers, Pipeline One builds and validates the static assets within its CI pipeline (Jenkins or local worker) and deploys pre-compiled static files directly to Vercel's global edge network.

---

## 2. Direct Static Asset Packaging & Upload

The deployment service (`server/src/services/pipeline/vercelDeployService.js`) performs atomic static deployment via the Vercel REST API:

1. **Asset Discovery & Hashing:**
   - Recursively walks the build output directory (`dist`, `build`, or `.`).
   - Computes SHA-1 hash of each static file (`index.html`, JavaScript bundles, CSS stylesheets, images).
2. **File Upload (`POST /v2/files`):**
   - Uploads each file with `x-vercel-digest: <sha1_hash>` and raw binary stream.
   - Vercel's content-addressable storage deduplicates unchanged files across deployments.
3. **Deployment Creation (`POST /v13/deployments`):**
   - Sends deployment payload referencing the hashed files list:
     ```json
     {
       "name": "my-static-project",
       "files": [
         { "file": "index.html", "sha": "..." },
         { "file": "assets/index.js", "sha": "..." }
       ],
       "projectSettings": {
         "framework": null
       },
       "target": "production"
     }
     ```
   - Vercel provisions an edge deployment and returns the deployment UID and preview URL (e.g., `https://my-static-project-abc123.vercel.app`).

---

## 3. Deployment Health Verification

After dispatching the deployment to Vercel, `deploymentVerificationService.js` performs end-to-end verification:

1. **State Polling:**
   - Polls `GET /v13/deployments/:deploymentId` until `readyState` reaches `READY` (or times out / reports `ERROR`).
2. **HTTP Health Check Probe:**
   - Performs an external HTTP GET request to `https://${deploymentUrl}/`.
   - Asserts HTTP 200/301 status.
   - Measures response latency in milliseconds.
3. **Live URL Persistence:**
   - Saves the verified live URL to `pipeline_executions.live_url` and emits it via Server-Sent Events (SSE).
