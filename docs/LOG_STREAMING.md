# Pipeline One — Log Streaming & Server-Side Secret Redaction

## 1. Overview

Pipeline One implements a terminal log streaming pipeline with **server-side secret redaction**. All log lines from Jenkins, Git, Docker, and Vercel are sanitized by `logStreamingService.js` on the server before they are persisted to the database or broadcasted over Server-Sent Events (SSE).

Client-side hiding is insufficient for security; redaction must occur on the backend so sensitive tokens never leave the server memory in plaintext.

---

## 2. Redaction Regular Expressions & Masking

The following regular expression patterns are applied in `logStreamingService.js`:

| Target Secret Type | Detection Pattern | Redaction Replacement |
|---|---|---|
| **GitHub Classic PAT** | `ghp_[A-Za-z0-9_]{36,255}` | `[REDACTED_GITHUB_TOKEN]` |
| **GitHub Fine-Grained PAT** | `github_pat_[A-Za-z0-9_]{50,255}` | `[REDACTED_GITHUB_TOKEN]` |
| **GitHub OAuth Token** | `gho_[A-Za-z0-9_]{36,255}` | `[REDACTED_GITHUB_TOKEN]` |
| **Vercel Access Token** | `(?:vercel_token\|VERCEL_TOKEN\|token)[=:]\s*([a-zA-Z0-9_-]{24,})` | `[REDACTED_VERCEL_TOKEN]` |
| **JWT Tokens** | `eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+` | `[REDACTED_JWT]` |
| **Authorization Bearer** | `(?:Authorization:\s*Bearer\s+)[A-Za-z0-9-_.]{16,}` | `Authorization: Bearer [REDACTED_BEARER]` |
| **Password CLI arguments** | `(?:password\|passwd\|pwd)[=:\s]+(["']?[^\s"']+["']?)` | `password=[REDACTED_PASSWORD]` |
| **Jenkins API Token** | `(?:jenkins_token\|JENKINS_TOKEN)[=:]\s*([a-zA-Z0-9]{32,})` | `[REDACTED_JENKINS_TOKEN]` |

---

## 3. Client Terminal Features (`LiveTerminalLogViewer.jsx`)

The terminal viewer component provides developer tooling:
- **Streaming Status Badge:** Indicates `Live SSE`, `Connecting`, `Reconnecting`, or `Archived`.
- **Search Bar:** Real-time client-side substring matching on message, stage tag, or timestamp.
- **Log Level Filter:** Filter logs by `ALL`, `INFO`, `WARN`, `ERROR`, or `SUCCESS`.
- **Stage Tag Highlighting:** Each line displays an uppercase tag corresponding to one of the 10 stages (`[BUILD]`, `[VERCEL_DEPLOYMENT]`, etc.).
- **Pause & Resume Controls:** Allows developers to inspect logs during high-volume build streaming without the view jumping to the bottom.
- **Auto-scroll Stick:** Keeps the terminal scrolled to the latest line as output streams in.
- **Clipboard Export:** One-click copy with formatted timestamps and tags.
- **File Download:** Exports raw `.txt` log file for offline archiving and audit compliance.

