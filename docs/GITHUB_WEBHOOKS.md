# Pipeline One — GitHub Webhook Automation & Ingestion

## 1. Overview

Pipeline One ingests real-time push events from GitHub to trigger automated CI/CD builds. The webhook receiver is secured by HMAC-SHA256 signature verification and protects against duplicate deliveries through idempotency guards.

---

## 2. Ingestion Endpoint

```http
POST /api/webhooks/github
Content-Type: application/json
X-Hub-Signature-256: sha256=<hmac_hash>
X-GitHub-Delivery: <guid>
X-GitHub-Event: <push | ping>
```

---

## 3. Security Implementation

### 1. Cryptographic HMAC-SHA256 Signature Verification
To prevent payload spoofing and tampering:
1. Express middleware preserves the raw binary body (`req.rawBody`) before JSON parsing.
2. The server computes:
   ```javascript
   const computedSignature = 'sha256=' + crypto
     .createHmac('sha256', project.webhook_secret)
     .update(rawBody)
     .digest('hex');
   ```
3. Signatures are compared using constant-time comparison (`crypto.timingSafeEqual`) to eliminate timing attack vectors.

### 2. Idempotency Guard (`X-GitHub-Delivery`)
GitHub retries unacknowledged webhooks. To prevent duplicate pipeline runs:
- The system logs every delivery ID in `github_webhook_events`.
- If a delivery ID is received that is already marked `processed`, the server immediately responds with HTTP 200 and ignores the duplicate.

---

## 4. Event Processing Workflow

1. **Ping Event (`X-GitHub-Event: ping`):**
   - Sent when a webhook is first created or tested.
   - Verified via signature and responded to with `{ message: "Webhook ping received successfully", zen: payload.zen }`.
2. **Push Event (`X-GitHub-Event: push`):**
   - The receiver extracts repository full name (`payload.repository.full_name`) and pushed branch (`payload.ref.replace('refs/heads/', '')`).
   - Resolves matching project in `projects` and `project_repositories`.
   - Checks if `pipeline_configurations.auto_deploy_on_push` is `true`.
   - Checks if pushed branch matches `pipeline_configurations.branch`.
   - If conditions match, dispatches an asynchronous pipeline run with `trigger_source = 'webhook_push'`.

---

## 5. Webhook Setup Walkthrough

1. Go to your GitHub repository -> **Settings** -> **Webhooks** -> **Add webhook**.
2. **Payload URL:** `https://your-pipeline-one-domain.com/api/webhooks/github`
3. **Content type:** Select `application/json`.
4. **Secret:** Copy the Webhook Secret generated in your project's Pipeline Configuration modal.
5. **Which events would you like to trigger this webhook?** Select **"Just the push event"**.
6. Ensure **"Active"** is checked and click **"Add webhook"**.
7. GitHub will send a test ping, which Pipeline One validates instantly.
