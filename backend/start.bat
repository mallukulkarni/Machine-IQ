@echo off
echo ============================================
echo   MATERIAL IQ - Backend Startup Script
echo ============================================
echo.

cd /d "%~dp0"

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting MATERIAL IQ Backend...
echo API Docs: http://127.0.0.1:8001/docs
echo Health:   http://127.0.0.1:8001/health
echo.
uvicorn main:app --reload --host 127.0.0.1 --port 8001
