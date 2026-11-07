# Pipeline One — Security Architecture & Hardening Audit

## 1. Security Architecture Overview

Pipeline One implements defense-in-depth across the application lifecycle. Security measures are active in the codebase and covered by automated tests.

---

## 2. Threat Vector Analysis & Implemented Controls

### 2.1 Multi-User Authorization Isolation
- **Threat:** User A accesses or tampers with User B's repositories, deployments, or credentials.
- **Controls:** All API routes verify the JWT subject (`req.userId`). Every database query enforces row-level ownership (`WHERE user_id = $1`). Unauthorized accesses return generic `404 Not Found` responses to prevent ID enumeration.
- **Verification:** Tested in `multiUserIsolation.test.js` (User B attempts cross-tenant reads, updates, and deletes).

### 2.2 Credential Vault & Cryptographic Protection
- **Threat:** Database compromise exposes GitHub PATs, Docker Hub credentials, Jenkins API tokens, or Vercel keys.
- **Controls:** All tokens are encrypted using **AES-256-GCM** authenticated encryption with an ephemeral 16-byte initialization vector (`iv`), ciphertext, and a 16-byte authentication tag (`authTag`). Plaintext credentials are never written to disk or logs.
- **Verification:** Tested in `security.test.js`.

### 2.3 Server-Side Secret Redaction
- **Threat:** Build logs stream or store sensitive tokens, revealing them in the UI or in log exports.
- **Controls:** `logStreamingService.js` processes all console and event output through regular expression redaction patterns before database persistence or SSE broadcasting. Masks GitHub PATs (`ghp_*`, `github_pat_*`), Vercel tokens, JWTs, Bearer headers, passwords, and Jenkins tokens.
- **Verification:** Tested in `secretRedaction.test.js`.

### 2.4 Server-Side Request Forgery (SSRF) Defense
- **Threat:** Malicious Jenkins server URLs target internal cloud metadata services (`169.254.169.254`), private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or loopback addresses.
- **Controls:** `ssrfValidator.js` parses the target hostname, executes asynchronous DNS resolution (`dns.lookup`), and matches all resolved IPv4 and IPv6 addresses against RFC 1918, RFC 3927, and loopback subnet blocks before HTTP requests are dispatched.
- **Verification:** Tested in `ssrfValidator.test.js`.

### 2.5 Archive Extraction (Zip-Slip Prevention)
- **Threat:** Uploaded ZIP archives contain path traversal sequences (`../../etc/passwd`) designed to overwrite system files upon unzipping.
- **Controls:** `zipService.js` inspects every entry's canonical path using `path.resolve`. If the resolved entry path does not start with the designated project extraction directory, the extraction is aborted immediately.
- **Verification:** Tested in `zipService.test.js`.

### 2.6 Webhook HMAC-SHA256 Signature Verification & Idempotency
- **Threat:** Attackers forge GitHub webhook push events or replay legitimate deliveries to trigger unauthorized builds.
- **Controls:** `webhookService.js` computes an HMAC-SHA256 digest over the raw request body using the shared secret and executes constant-time buffer comparison (`crypto.timingSafeEqual`). Deliveries are deduplicated via unique `X-GitHub-Delivery` IDs stored in `github_webhook_events`.
- **Verification:** Tested in `webhookSignature.test.js`.

### 2.7 Application Rate Limiting & HTTP Security Headers
- **Threat:** Denial-of-service brute force and clickjacking attacks.
- **Controls:** Express rate limiting limits requests to 1,000 requests per 15-minute window (`rateLimiter.js`). Helmet injects `X-Frame-Options`, `X-XSS-Protection`, and `X-Content-Type-Options: nosniff`.

