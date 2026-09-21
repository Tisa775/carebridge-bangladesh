@echo off
title CareBridge Bangladesh - Launcher
color 0A

echo ======================================================================
echo    CareBridge Bangladesh - Humanitarian Dispatch System
echo    Full-Stack FastAPI Backend + Web Dashboard
echo ======================================================================
echo.

set PATH=%USERPROFILE%\.local\bin;%PATH%
set WORKDIR=%~dp0
cd /d "%WORKDIR%"

:: 1. Verify Virtual Environment
if not exist "backend\.venv\Scripts\python.exe" (
    echo [1/3] Setting up Python virtual environment...
    if exist "%USERPROFILE%\.local\bin\uv.exe" (
        cd backend
        uv venv
        uv pip install -r requirements.txt
        cd ..
    ) else (
        echo Error: Neither Python nor UV was found.
        echo Please ensure UV is in %USERPROFILE%\.local\bin
        pause
        exit /b 1
    )
) else (
    echo [1/3] Python virtual environment detected.
)

:: 2. Ensure Database is Seeded
if not exist "backend\carebridge.db" (
    echo [2/3] Seeding initial crisis & NGO database...
    cd backend
    .venv\Scripts\python seed.py
    cd ..
) else (
    echo [2/3] Database ready.
)

:: 3. Start FastAPI Server
echo [3/3] Starting CareBridge FastAPI Server on port 8000...
echo.
echo ======================================================================
echo   * Web Dashboard:  http://127.0.0.1:8000/app/landing.html
echo   * Direct SPA:     http://127.0.0.1:8000/app/index.html
echo   * Interactive Docs: http://127.0.0.1:8000/docs
echo   * Demo Login:     argho@carebridge.org / demo123
echo ======================================================================
echo.

start "CareBridge API Backend" "%WORKDIR%backend\.venv\Scripts\uvicorn.exe" main:app --app-dir "%WORKDIR%backend" --host 127.0.0.1 --port 8000 --reload

:: Wait 2 seconds then open in default browser
timeout /t 2 /nobreak >nul
start http://127.0.0.1:8000/app/landing.html

echo CareBridge Bangladesh is now running! Keep this window open or press any key to exit.
pause
