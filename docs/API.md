# Pipeline One — API Endpoint Documentation

Base URL: `http://localhost:5000/api`

---

## 1. System & Health

### `GET /api/health`
Returns system status, database health, environment details, and version.

**Response (200 OK):**
```json
{
  "success": true,
  "status": "operational",
  "service": "Pipeline One API Server",
  "version": "1.0.0",
  "uptimeSeconds": 142,
  "environment": "development",
  "databases": {
    "postgresql": { "status": "connected", "mode": "postgresql" },
    "mongodb_atlas": { "configured": false, "status": "not_configured" }
  },
  "integrations": {
    "github_oauth_configured": true,
    "pat_supported": true
  }
}
```

---

## 2. Authentication

### `POST /api/auth/register`
Creates a new user account, hashes password with bcrypt, and sets HttpOnly cookie.
- **Body**: `{ "name": "string", "email": "string", "password": "string (min 8)" }`

### `POST /api/auth/login`
Authenticates user and returns JWT session.
- **Body**: `{ "email": "string", "password": "string" }`

### `POST /api/auth/logout`
Clears session cookie and invalidates client session.

### `GET /api/auth/me`
*Requires Authentication*  
Returns current authenticated user, settings, and integration status summary.

### `PUT /api/auth/settings`
*Requires Authentication*  
Updates user dashboard preferences.
- **Body**: `{ "theme": "dark", "notifications_enabled": true, "auto_deploy_enabled": false }`

### `GET /api/auth/activity`
*Requires Authentication*  
Returns audit records of recent account events.

---

## 3. GitHub Integrations

### `GET /api/integrations/github/connect`
*Requires Authentication*  
Generates a signed OAuth URL with HMAC state parameter.
- **Query**: `?redirect=true` (optional redirect)

### `GET /api/integrations/github/callback`
Handles OAuth redirection from GitHub, validates HMAC state, exchanges code for access token, encrypts token with AES-256-GCM, and updates database.

### `POST /api/integrations/github/connect-pat`
*Requires Authentication*  
Connects GitHub account directly using a Personal Access Token.
- **Body**: `{ "personalAccessToken": "ghp_xxxxxxxxxxxxxxxx" }`

### `GET /api/integrations/github/status`
*Requires Authentication*  
Returns GitHub connection status, linked username, and avatar.

### `DELETE /api/integrations/github/disconnect`
*Requires Authentication*  
Removes GitHub integration and encrypted credentials from database.

---

## 4. GitHub Repositories

### `GET /api/github/repositories`
*Requires Authentication & Connected GitHub*  
Lists accessible repositories for the authenticated user.
- **Query parameters**: `search`, `visibility` (`all`, `public`, `private`), `page`, `per_page`.

### `GET /api/github/repositories/:owner/:repo`
*Requires Authentication & Connected GitHub*  
Retrieves repository branches, root directory tree, README, and static architecture analysis.

### `GET /api/github/repositories/:owner/:repo/branches`
*Requires Authentication & Connected GitHub*  
Retrieves branch list for a repository.

---

## 5. Projects

### `GET /api/projects`
*Requires Authentication*  
Lists all projects created by the user (both GitHub repos and uploaded ZIPs).

### `GET /api/projects/:id`
*Requires Authentication*  
Retrieves a single project with full repository and static detection metadata.

### `DELETE /api/projects/:id`
*Requires Authentication*  
Deletes project, repository association, and local storage archive.

### `POST /api/projects/upload`
*Requires Authentication*  
Uploads a `.zip` archive, extracts it safely, detects static framework, and registers project.
- **Multipart form data**: `file` (max 50MB), `name` (optional), `description` (optional).

### `POST /api/projects/select-repository`
*Requires Authentication*  
Persists a selected GitHub repository as a tracked Pipeline One project.
- **Body**:
```json
{
  "repoId": 123456,
  "owner": "octocat",
  "name": "hello-world",
  "fullName": "octocat/hello-world",
  "defaultBranch": "main",
  "selectedBranch": "main",
  "cloneUrl": "https://github.com/octocat/hello-world.git",
  "isPrivate": false,
  "description": "Static web project"
}
```
