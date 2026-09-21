# CareBridge Bangladesh - PowerShell Launcher
$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   CareBridge Bangladesh - Humanitarian Dispatch System" -ForegroundColor Green
Write-Host "   Full-Stack FastAPI Backend + Web Dashboard" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$workdir = $PSScriptRoot
Set-Location $workdir
$env:Path = "$HOME\.local\bin;$env:Path"

# 1. Virtual environment check
$pythonExe = Join-Path $workdir "backend\.venv\Scripts\python.exe"
$uvicornExe = Join-Path $workdir "backend\.venv\Scripts\uvicorn.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "[1/3] Setting up Python virtual environment..." -ForegroundColor Yellow
    Set-Location (Join-Path $workdir "backend")
    uv venv
    uv pip install -r requirements.txt
    Set-Location $workdir
} else {
    Write-Host "[1/3] Python virtual environment detected." -ForegroundColor Green
}

# 2. Database seed check
$dbPath = Join-Path $workdir "backend\carebridge.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "[2/3] Seeding initial database..." -ForegroundColor Yellow
    Set-Location (Join-Path $workdir "backend")
    & $pythonExe seed.py
    Set-Location $workdir
} else {
    Write-Host "[2/3] Database ready." -ForegroundColor Green
}

# 3. Launch server
Write-Host "[3/3] Starting CareBridge FastAPI Server on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  * Landing Page:      http://127.0.0.1:8000/app/landing.html" -ForegroundColor White
Write-Host "  * Command Dashboard: http://127.0.0.1:8000/app/index.html" -ForegroundColor White
Write-Host "  * Swagger Docs:      http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  * Demo Credentials:  argho@carebridge.org / demo123" -ForegroundColor White
Write-Host ""

Start-Process "http://127.0.0.1:8000/app/landing.html"
& $uvicornExe main:app --app-dir (Join-Path $workdir "backend") --host 127.0.0.1 --port 8000 --reload
