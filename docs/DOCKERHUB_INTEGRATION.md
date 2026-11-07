# Docker Hub Integration Guide

Pipeline One provides first-class, authenticated integration with Docker Hub to explore repositories, inspect tags, tag local multi-stage container builds, and push production static image manifests.

---

## 1. Security First: Token Authentication

> **CRITICAL SECURITY REQUIREMENT:** Pipeline One strictly prohibits storing or requesting account passwords. All operations are performed exclusively via Docker Hub **Personal Access Tokens (PAT)**.

Tokens are stored using the enterprise-grade AES-256-GCM Credential Vault:
- **Cipher:** `aes-256-gcm`
- **Key Source:** 32-byte hexadecimal `CREDENTIAL_ENCRYPTION_KEY`
- **Initialization Vector:** 16-byte cryptographically secure random bytes per record
- **Authentication Tag:** 16-byte GCM authentication tag preventing tampering
- **In-Transit Protection:** Tokens are never returned to client browser sessions or included in telemetry logs.

---

## 2. Generating a Docker Hub Personal Access Token

Follow these steps to create an access token for Pipeline One:

1. Log in to [Docker Hub](https://hub.docker.com/).
2. Click your avatar in the upper right corner and navigate to **Account Settings**.
3. Select **Security** from the left navigation menu.
4. Click **New Access Token**.
5. Fill in the token details:
   - **Access Token Description:** `Pipeline One Automation Engine`
   - **Access Permissions:** `Read, Write, Delete` (or `Read & Write`)
6. Click **Generate** and immediately copy the token (format: `dckr_pat_xxxxxxxxxxxxxxxxxxxx`).

---

## 3. Connecting to Pipeline One

### Via Dashboard UI:
1. Navigate to **Integrations Hub** (`/dashboard/integrations`).
2. Click **Connect Docker Hub** on the Docker Hub card.
3. Enter:
   - Your Docker Hub username (e.g., `janedev`).
   - The Personal Access Token generated above.
4. Click **Connect Docker Hub**.

### Via Guided Wizard:
- Click **Launch Setup Wizard** on the Integrations page and complete Step 2.

### Via REST API:
```bash
POST /api/integrations/dockerhub/connect
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "username": "janedev",
  "personalAccessToken": "dckr_pat_xxxxxxxxxxxxxxxxxxxx"
}
```

---

## 4. Verification and Latency Measurement

Verify your Docker Hub connection at any time:
- In the dashboard, click **Verify** on the Docker Hub card.
- Or send a `POST /api/integrations/dockerhub/verify` request.

The backend verifies the token directly against `https://hub.docker.com/v2/user`, records latency in milliseconds, and logs the verification timestamp in `connected_integrations.metadata`.

---

## 5. Repository & Tag Exploration

Once connected, Pipeline One users can explore their Docker Hub assets:

- **List Repositories:** `GET /api/dockerhub/repositories?page=1&pageSize=25`
- **List Tags:** `GET /api/dockerhub/repositories/:namespace/:repository/tags`

---

## 6. Automated Container Publishing

When building a static site image:
1. Check the box **"Publish image to Docker Hub upon successful build"**.
2. Specify the destination repository (defaults to `<username>/<project-name>`).
3. The build engine:
   - Generates the Dockerfile.
   - Executes `docker build -t <tag> .`
   - Runs `docker login -u <username> --password-stdin` using the decrypted PAT.
   - Runs `docker push <destinationRepo>:<tag>`.
   - Records the build status as `completed` and registers the image in `docker_images`.

---

## 7. Token Revocation and Disconnection

To disconnect:
- Click **Disconnect** on the Docker Hub card.
- Confirm the dialog.
- The backend removes the encrypted token from `connected_integrations` and deletes cached repository metadata.
- Users can revoke the token on Docker Hub under Security Settings at any time.
