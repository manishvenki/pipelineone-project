# Pipeline One — Pipeline Security Architecture

## 1. Overview

Pipeline One implements defense-in-depth security principles across integration credentials, webhook ingestion, CI build isolation, and edge deployments.

---

## 2. Key Security Controls

### 1. Token-Only Authentication
- **Docker Hub, Jenkins, and Vercel credentials require API tokens or Personal Access Tokens (PAT).** Account passwords are strictly rejected at the validation layer.
- Scope minimization: tokens require only minimal read/write scopes necessary for operation.

### 2. Envelope Encryption (AES-256-GCM)
- All access tokens and sensitive integration metadata are encrypted before storage using **AES-256-GCM** with a 96-bit initialization vector (IV) and a 128-bit authentication tag.
- Ciphertext, IV, and auth tag are stored in `connected_integrations.encrypted_token`.
- Plaintext secrets are decrypted in-memory only when actively executing an API call or build step.

### 3. Masked Credentials in Logs & Output
- Build and execution logs pass through regex sanitizers that redact API keys, bearer tokens, passwords, and private tokens before persisting to `pipeline_events` or streaming over SSE.
- Truncated fingerprints (`••••••••••••1234`) are displayed in UI consoles.

### 4. Constant-Time Webhook Signature Verification
- Ingested GitHub webhooks are verified with HMAC-SHA256 (`X-Hub-Signature-256`).
- Signature comparison uses `crypto.timingSafeEqual` over fixed-length binary buffers to eliminate side-channel timing attack vectors.

### 5. Idempotency Guard Against Replay Attacks
- Webhooks inspect the `X-GitHub-Delivery` GUID and deduplicate payloads via `github_webhook_events`. Repeated or replayed deliveries are discarded safely.

### 6. SSRF (Server-Side Request Forgery) Protection
- All user-supplied Jenkins server URLs are validated by `ssrfValidator.js` before making any HTTP request.
- Requests targeting `localhost`, `127.0.0.1`, `::1`, private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local addresses (`169.254.0.0/16`), and non-HTTP protocols are rejected.

### 7. Process Execution Isolation & Timeouts
- Subprocess execution (`runCommandInDirectory`) operates with a strict 30-second timeout guard to prevent runaway processes from hanging server resources.
- Node commands inspect directories for `package.json` before invoking `npm` to prevent directory traversal escapes.

