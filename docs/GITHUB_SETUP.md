# Pipeline One — GitHub Integration Setup Guide

Pipeline One supports two seamless methods to connect to GitHub:
1. **GitHub OAuth App (Recommended for production)**
2. **Personal Access Token (PAT) (Instant setup for development/evaluation)**

---

## Option 1: GitHub OAuth App Setup

To enable one-click OAuth authorization for your users:

### Step 1: Create an OAuth App in GitHub
1. Sign in to [GitHub](https://github.com).
2. Go to **Settings** > **Developer settings** > **OAuth Apps**.
3. Click **New OAuth App**.
4. Fill in the following details:
   - **Application name**: `Pipeline One`
   - **Homepage URL**: `http://localhost:5173`
   - **Application description**: `Lightweight DevOps automation platform for static web projects`
   - **Authorization callback URL**: `http://localhost:5000/api/integrations/github/callback`
5. Click **Register application**.

### Step 2: Retrieve Credentials
1. Copy the **Client ID**.
2. Click **Generate a new client secret** and copy the **Client Secret**.

### Step 3: Configure `.env`
Update your `.env` file (or set environment variables):
```env
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:5000/api/integrations/github/callback
```

### Step 4: Restart Server
```bash
npm run dev
```

---

## Option 2: Personal Access Token (PAT) Connection

If you want to immediately connect without creating an OAuth app:

1. Go to [GitHub Tokens (Classic)](https://github.com/settings/tokens).
2. Click **Generate new token** (classic).
3. Set note: `Pipeline One Local Connection`.
4. Select the minimum required scopes:
   - `repo` (Full control of private and public repositories)
   - `read:user` (Read all user profile data)
5. Click **Generate token** and copy the string (`ghp_...`).
6. In Pipeline One, open **Integrations** > **Connect GitHub** > **Personal Access Token tab**, paste the token, and click **Connect Token**.
7. The token is immediately verified against the GitHub API and securely encrypted with AES-256-GCM.
