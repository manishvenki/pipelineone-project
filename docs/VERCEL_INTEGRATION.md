# Vercel Platform Integration Guide

Pipeline One integrates with Vercel to manage projects, verify edge deployment configurations, inspect team workspaces, and prepare static websites for worldwide CDN distribution.

---

## 1. Supported Authentication Methods

Pipeline One supports two authentication methods for Vercel:

1. **OAuth 2.0 Integration (Recommended for Multi-user SaaS):**
   - Redirects users to `https://vercel.com/oauth/authorize`.
   - Obtains an access token upon user approval.
   - Automatically scopes permissions to personal or team accounts.
2. **Personal Access Token (PAT) (Fastest & Simplest):**
   - Direct token creation via Vercel dashboard.
   - Ideal for private installations, CI bots, or team deployments.

All tokens are stored encrypted using AES-256-GCM.

---

## 2. Generating a Vercel Personal Access Token

1. Sign in to your [Vercel Dashboard](https://vercel.com/).
2. Click your profile avatar in the upper right and select **Account Settings** (or Team Settings).
3. Navigate to **Tokens** in the left sidebar.
4. Click **Create Token**.
5. Set:
   - **Token Name:** `Pipeline One Deployment Integration`
   - **Scope:** Full Account or selected Projects
   - **Expiration:** Set according to your internal security policies (e.g., 90 days or No Expiration)
6. Click **Create** and copy the generated token.

---

## 3. Configuring OAuth 2.0 (Optional Server Configuration)

To enable 1-click OAuth redirects for your Pipeline One deployment:

1. Visit [Vercel Developer Console](https://vercel.com/dashboard/integrations/console).
2. Create a new Integration / OAuth application.
3. Configure Redirect URI:
   ```
   https://your-domain.com/api/integrations/vercel/callback
   ```
4. Set the following environment variables on your Pipeline One server:
   ```env
   VERCEL_CLIENT_ID=oac_xxxxxxxxxxxxxxxxxxxx
   VERCEL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
   VERCEL_REDIRECT_URI=http://localhost:5000/api/integrations/vercel/callback
   ```

---

## 4. Connecting Vercel in Pipeline One

### Via Dashboard:
1. Open **Integrations Hub** (`/dashboard/integrations`).
2. Click **Connect Vercel**.
3. Under the **Personal Access Token** tab, paste your Vercel token and optional Team Slug.
4. Click **Connect Vercel**.

### Via API:
```bash
POST /api/integrations/vercel/token-connect
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

---

## 5. Verification & Project Management

- **Verify Connection:** `POST /api/integrations/vercel/verify`
  - Validates token against `https://api.vercel.com/v2/user`.
  - Records response latency in milliseconds.
- **List Projects:** `GET /api/vercel/projects`
  - Queries active Vercel projects, frameworks, and deployment targets.
- **Configure Deployment Target:**
  ```bash
  POST /api/vercel/configure
  Content-Type: application/json

  {
    "projectId": "<pipeline_one_project_id>",
    "vercelProjectId": "<vercel_project_id>",
    "framework": "vite",
    "buildCommand": "npm run build",
    "outputDirectory": "dist"
  }
  ```

