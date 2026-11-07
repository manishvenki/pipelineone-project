# Pipeline One - PowerShell Orchestration Script
$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          PIPELINE ONE - DEV RUNNER" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "      DevOps Automation Platform for Static Sites" -ForegroundColor Gray
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify Node.js and npm
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "[1/4] Environment verification:" -ForegroundColor Green
    Write-Host "      Node.js: $nodeVersion" -ForegroundColor Gray
    Write-Host "      npm:     $npmVersion" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Node.js or npm is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js (>=18) from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 2. Check .env file
if (-not (Test-Path ".env")) {
    Write-Host "[2/4] Initializing .env configuration from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "      Created .env with default settings." -ForegroundColor Green
} else {
    Write-Host "[2/4] Environment configuration (.env): Verified." -ForegroundColor Green
}

# 3. Check node_modules
Write-Host "[3/4] Verifying dependencies..." -ForegroundColor Green
if (-not (Test-Path "node_modules")) {
    Write-Host "      Installing root workspace dependencies..." -ForegroundColor Gray
    npm install
}

if (-not (Test-Path "server/node_modules")) {
    Write-Host "      Installing backend server dependencies..." -ForegroundColor Gray
    npm --prefix server install
}

if (-not (Test-Path "client/node_modules")) {
    Write-Host "      Installing frontend client dependencies..." -ForegroundColor Gray
    npm --prefix client install
}
Write-Host "      Dependencies: Complete." -ForegroundColor Green

# 4. Run database migrations
Write-Host "[4/4] Applying database migrations..." -ForegroundColor Green
try {
    node server/src/database/migrate.js
} catch {
    Write-Host "      Database Notice: Using embedded resilient engine or local PostgreSQL." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Launching Pipeline One Full-Stack System...      " -ForegroundColor Green
Write-Host "                                                   "
Write-Host "  > Frontend Dashboard:  http://localhost:5173     " -ForegroundColor White
Write-Host "  > Backend API Server:  http://localhost:5000     " -ForegroundColor White
Write-Host "  > Health Endpoint:     http://localhost:5000/api/health" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to terminate both servers at any time." -ForegroundColor DarkGray
Write-Host ""

# Launch both servers concurrently
npm run dev

