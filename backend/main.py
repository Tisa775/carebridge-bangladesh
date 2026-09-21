"""
CareBridge Bangladesh – FastAPI Application Entry Point
========================================================
Serves:
  - REST API at  /api/*
  - Frontend SPA at /app/* (static HTML/CSS/JS files)
  - API docs at  /docs and /redoc

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse

from database import engine, Base, get_current_db_info
from routers import auth, cases, ngos, volunteers, alerts, messages, analytics, ai_insights, export

# ─── Create all DB tables (idempotent) ───────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ─── FastAPI App ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="CareBridge Bangladesh API",
    description=(
        "Real-time humanitarian crisis management, NGO coordination, "
        "and emergency response platform for Bangladesh."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS (allows browser requests from any origin during development) ────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API Routers ─────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(ngos.router)
app.include_router(volunteers.router)
app.include_router(alerts.router)
app.include_router(messages.router)
app.include_router(analytics.router)
app.include_router(ai_insights.router)
app.include_router(export.router)

# ─── Activity Log Endpoint (standalone, not a router) ────────────────────────
from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from typing import List

@app.get("/api/activity", response_model=List[schemas.ActivityLogOut], tags=["Analytics"])
def get_activity_log(limit: int = 10, db: Session = Depends(get_db)):
    """Returns the most recent system-wide activity log entries."""
    entries = db.query(models.ActivityLog).order_by(
        models.ActivityLog.timestamp.desc()
    ).limit(limit).all()
    return [schemas.ActivityLogOut.model_validate(e) for e in entries]

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
def health_check():
    """Server health check — returns status, version, and active database."""
    db_info = get_current_db_info()
    return {
        "status": "operational",
        "platform": "CareBridge Bangladesh",
        "version": "1.0.0",
        "database": db_info["active_type"],
        "mysql_database": db_info["mysql_database"],
        "api_base": "/api",
        "docs": "/docs",
    }

# ─── Static Frontend Files ────────────────────────────────────────────────────
# Mount the parent frontend directory at /app so all HTML/CSS/JS is served.
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

# ─── Root Redirect ────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def root():
    """Redirect root to the landing page."""
    return RedirectResponse(url="/app/landing.html")

# ─── 404 Fallback ─────────────────────────────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request, exc):
    # Only return JSON 404 for /api routes; redirect others to landing
    if request.url.path.startswith("/api"):
        return JSONResponse(
            status_code=404,
            content={"detail": f"Endpoint not found: {request.url.path}"}
        )
    return RedirectResponse(url="/app/landing.html")
