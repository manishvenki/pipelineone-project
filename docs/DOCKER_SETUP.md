# Docker Engine Setup & Configuration Guide

This guide details how to install, configure, verify, and operate the Docker Engine daemon to power Pipeline One's containerization capabilities.

---

## 1. System Requirements

Pipeline One's containerization engine relies on the native `docker` command-line interface and an active Docker daemon.

| Component | Minimum Requirement | Recommended |
|-----------|---------------------|-------------|
| **OS** | Windows 10/11 64-bit, Ubuntu 20.04+, macOS 12+ | Windows 11 with WSL2 / Ubuntu 22.04 LTS |
| **RAM** | 4 GB | 8 GB+ |
| **Disk Space** | 10 GB free | 25 GB+ for image layers & caches |
| **Docker CLI** | 20.10+ | 24.0+ (Tested with 29.6+) |
| **Runtime Daemon** | Docker Desktop / Linux `dockerd` | Active system daemon |

---

## 2. Installation Instructions

### Windows (Docker Desktop)
1. Download and install **Docker Desktop for Windows** from [Docker Official Site](https://www.docker.com/products/docker-desktop/).
2. Enable the **WSL 2 backend** during setup.
3. Start Docker Desktop and verify the daemon tray icon turns green.
4. Open PowerShell and confirm availability:
   ```powershell
   docker --version
   docker info
   ```

### Linux (Ubuntu / Debian)
1. Install Docker Engine using the official repository:
   ```bash
   sudo apt-get update
   sudo apt-get install ca-certificates curl gnupg
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   sudo chmod a+r /etc/apt/keyrings/docker.gpg

   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   sudo apt-get update
   sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin
   ```
2. Enable and start the systemd service:
   ```bash
   sudo systemctl enable --now docker
   ```
3. Add your application user to the `docker` group to permit socket communication:
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

---

## 3. Daemon Socket Paths

Pipeline One communicates with Docker through the standard system CLI, which binds to:

- **Windows Named Pipe:** `\\.\pipe\docker_engine` or `\\.\pipe\dockerDesktopLinuxEngine`
- **Linux Unix Socket:** `/var/run/docker.sock`

If running Pipeline One server inside a container in production, mount the host Docker socket:
```bash
-v /var/run/docker.sock:/var/run/docker.sock
```

---

## 4. Verification and Diagnostic Endpoint

Pipeline One provides an internal health check endpoint for Docker:

- **Route:** `GET /api/docker/engine`
- **Output:**
  ```json
  {
    "success": true,
    "available": true,
    "cliVersion": "Docker version 29.6.1, build d25b5e7",
    "daemon": {
      "serverVersion": "24.0.7",
      "operatingSystem": "Docker Desktop",
      "containers": 2,
      "images": 14
    }
  }
  ```

If the daemon is offline, Pipeline One gracefully detects the failure:
```json
{
  "success": true,
  "available": false,
  "cliVersion": "Docker version 29.6.1, build d25b5e7",
  "error": "Docker daemon is unreachable. Please start Docker Desktop or the dockerd service."
}
```

---

## 5. Troubleshooting Common Daemon Issues

### 1. `The system cannot find the file specified (//./pipe/dockerDesktopLinuxEngine)`
- **Cause:** Docker Desktop is installed, but the Linux engine daemon has not finished initializing or is stopped.
- **Fix:** Launch Docker Desktop from the Start menu and wait until "Docker Desktop running" is shown.

### 2. `Got permission denied while trying to connect to the Docker daemon socket`
- **Cause:** Non-root Linux user without docker group membership.
- **Fix:** Run `sudo usermod -aG docker $USER` and log out/in.

### 3. Build Process Hangs or Fails with ENOSPC
- **Cause:** Docker build cache or root filesystem has run out of disk space.
- **Fix:** Prune stale build caches and unused image layers:
  ```bash
  docker builder prune -f
  docker system prune -f
  ```

