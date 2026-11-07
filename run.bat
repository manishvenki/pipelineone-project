@echo off
setlocal enabledelayedexpansion

title Pipeline One - DevOps Automation Platform

echo ===================================================
echo           PIPELINE ONE - DEV RUNNER
echo      DevOps Automation Platform for Static Sites
echo ===================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js v18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in your system PATH.
    pause
    exit /b 1
)

echo [1/4] Environment verification...
node -v >nul 2>nul
echo        Node.js: OK
echo        npm:     OK

:: 3. Check .env
if not exist ".env" (
    echo [2/4] Creating .env from .env.example...
    copy ".env.example" ".env" >nul
    echo        .env created with safe defaults.
) else (
    echo [2/4] .env configuration: Found.
)

:: 4. Check dependencies
if not exist "node_modules\" (
    echo [3/4] Installing root dependencies...
    call npm install
)

if not exist "server\node_modules\" (
    echo [3/4] Installing server dependencies...
    call npm --prefix server install
)

if not exist "client\node_modules\" (
    echo [3/4] Installing client dependencies...
    call npm --prefix client install
)
echo [3/4] Dependencies: Verified.

:: 5. Run Database Migrations
echo [4/4] Checking database schema...
call node server/src/database/migrate.js

echo.
echo ===================================================
echo   Starting Pipeline One Full-Stack System...
echo.
echo   Frontend:     http://localhost:5173
echo   Backend API:  http://localhost:5000
echo   Health Check: http://localhost:5000/api/health
echo ===================================================
echo.

:: Start concurrently
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] Process terminated.
    pause
)
