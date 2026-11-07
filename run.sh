#!/usr/bin/env bash
set -e

echo "==================================================="
echo "          PIPELINE ONE - DEV RUNNER"
echo "      DevOps Automation Platform for Static Sites"
echo "==================================================="
echo ""

# 1. Check Node.js and npm
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not installed or not in PATH."
    exit 1
fi

echo "[1/4] Environment verification:"
echo "      Node.js: $(node -v)"
echo "      npm:     $(npm -v)"

# 2. Check .env
if [ ! -f ".env" ]; then
    echo "[2/4] Initializing .env from .env.example..."
    cp .env.example .env
else
    echo "[2/4] Environment (.env): Verified."
fi

# 3. Check dependencies
echo "[3/4] Verifying dependencies..."
[ ! -d "node_modules" ] && npm install
[ ! -d "server/node_modules" ] && npm --prefix server install
[ ! -d "client/node_modules" ] && npm --prefix client install
echo "      Dependencies: Complete."

# 4. Run database migrations
echo "[4/4] Applying database migrations..."
node server/src/database/migrate.js || true

echo ""
echo "==================================================="
echo "  Launching Pipeline One Full-Stack System...      "
echo "  Frontend Dashboard: http://localhost:5173        "
echo "  Backend API Server: http://localhost:5000        "
echo "  Health Endpoint:    http://localhost:5000/api/health"
echo "==================================================="
echo ""

npm run dev
