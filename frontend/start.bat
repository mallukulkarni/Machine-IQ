@echo off
echo ============================================
echo   MATERIAL IQ - Frontend Startup Script
echo ============================================
echo.

cd /d "%~dp0"

REM Node is installed here on some Windows setups but is not on PATH.
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"

echo Installing dependencies (if needed)...
call pnpm install 2>nul || call npm install

echo.
echo Starting MATERIAL IQ Frontend...
echo Dashboard: http://localhost:5173
echo.
call pnpm dev 2>nul || call npm run dev
