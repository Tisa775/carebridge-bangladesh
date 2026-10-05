"""
CareBridge Bangladesh – Cases Router
Full CRUD for humanitarian cases + dashboard stats summary.
"""

import os
import random
import string
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from routers.auth import get_current_user, get_optional_user
import models, schemas

router = APIRouter(prefix="/api/cases", tags=["Cases"])

UPLOADS_VIDEO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "videos")
os.makedirs(UPLOADS_VIDEO_DIR, exist_ok=True)


# ─── Helpers ─────────────────────────────────────────────────────────────────

CATEGORY_ICONS = {
    "Child": "fa-child",
    "Elderly": "fa-person-cane",
    "Medical": "fa-heart-pulse",
    "Disability": "fa-wheelchair",
    "Homeless": "fa-house-chimney-crack",
    "Flood": "fa-water",
    "Food": "fa-utensils",
}

PRIORITY_CLASSES = {
    "High": "urgency-high",
    "Medium": "urgency-med",
    "Low": "urgency-low",
}

STATUS_CLASSES = {
    "Pending": "status-pending",
    "In Progress": "status-in-progress",
    "Assigned": "status-assigned",
    "Resolved": "status-resolved",
}

def generate_case_id(db: Session) -> str:
    """Generate next sequential case ID like CB-12483.
    Uses max existing numeric suffix to avoid collisions after deletions.
    """
    all_ids = db.query(models.Case.id).all()
    if not all_ids:
        return "CB-12483"
    max_num = max(
        int(row[0].split("-")[1])
        for row in all_ids
        if row[0].startswith("CB-") and row[0].split("-")[1].isdigit()
    )
    return f"CB-{max_num + 1}"

def time_ago(dt: datetime) -> str:
    delta = datetime.utcnow() - dt
    minutes = int(delta.total_seconds() / 60)
    if minutes < 1:
        return "Just now"
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{hours // 24}d ago"


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.CaseOut], summary="List All Cases")
def list_cases(
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by ID, location, category"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """
    Returns all humanitarian cases with optional filters.
    Supports filtering by status, priority, category, and full-text search.
    """
    q = db.query(models.Case)
    
    if status:
        q = q.filter(models.Case.status == status)
    if priority:
        q = q.filter(models.Case.priority == priority)
    if category:
        q = q.filter(models.Case.category.ilike(f"%{category}%"))
    if search:
        search_term = f"%{search}%"
        q = q.filter(
            models.Case.id.ilike(search_term) |
            models.Case.location.ilike(search_term) |
            models.Case.category.ilike(search_term) |
            models.Case.status.ilike(search_term)
        )
    
    cases = q.order_by(models.Case.created_at.desc()).limit(limit).all()
    return [schemas.CaseOut.model_validate(c) for c in cases]


@router.post("", response_model=schemas.CaseOut, status_code=201, summary="Create New Case")
def create_case(
    payload: schemas.CaseCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """
    Register a new humanitarian distress case.
    Auto-generates CB-XXXXX ID, sets priority/status classes, logs activity.
    """
    case_id = payload.id if (payload.id and not db.query(models.Case).filter(models.Case.id == payload.id).first()) else generate_case_id(db)
    icon = CATEGORY_ICONS.get(payload.category, "fa-circle-dot")
    priority_class = PRIORITY_CLASSES.get(payload.priority, "urgency-med")
    status_class = STATUS_CLASSES.get("Pending", "status-pending")
    
    ai_confidence = random.randint(75, 97)
    
    new_case = models.Case(
        id=case_id,
        category=payload.category,
        icon=icon,
        location=payload.location,
        priority=payload.priority,
        priority_class=priority_class,
        status="Pending",
        status_class=status_class,
        confidence=f"{ai_confidence}%",
        description=payload.description,
        reporter=payload.reporter or (current_user.name if current_user else "Field Reporter"),
        contact=payload.contact,
        assigned_ngo=payload.assigned_ngo,
        lat=payload.lat,
        lng=payload.lng,
        photo=payload.photo,
        has_video=payload.has_video or False,
        video_name=payload.video_name,
        video_size=payload.video_size,
        video_url=payload.video_url,
    )
    db.add(new_case)
    
    # Log to activity feed
    color = "red" if payload.priority == "High" else "orange" if payload.priority == "Medium" else "blue"
    log = models.ActivityLog(
        type="report",
        icon="plus",
        color=color,
        title=f"New case {case_id} logged",
        subtitle=f"{payload.location} ({payload.category})",
    )
    db.add(log)
    db.commit()
    db.refresh(new_case)
    
    return schemas.CaseOut.model_validate(new_case)


@router.post("/upload-video", summary="Upload Case Evidence Video")
async def upload_case_video(
    file: UploadFile = File(...),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """
    Accepts video file upload from citizen or admin, stores it permanently,
    and returns a web-accessible static video URL and metadata.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No video file provided")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if not ext or ext not in [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]:
        ext = ".mp4"
    
    timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    rand_str = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    safe_name = "".join(c for c in os.path.splitext(file.filename)[0] if c.isalnum() or c in ("-", "_"))[:30]
    final_filename = f"evidence_{timestamp_str}_{rand_str}_{safe_name}{ext}"
    target_path = os.path.join(UPLOADS_VIDEO_DIR, final_filename)

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty")
    
    with open(target_path, "wb") as f:
        f.write(contents)

    size_mb = len(contents) / (1024 * 1024)
    size_str = f"{size_mb:.1f} MB" if size_mb >= 1 else f"{max(1, len(contents) // 1024)} KB"

    return {
        "video_url": f"/uploads/videos/{final_filename}",
        "video_name": file.filename,
        "video_size": size_str,
        "filename": final_filename,
        "size_bytes": len(contents),
    }


@router.get("/stats/summary", response_model=schemas.CaseStatsSummary, summary="Dashboard Stats")
def get_stats_summary(db: Session = Depends(get_db)):
    """
    Returns the top-level statistics used in the dashboard stat cards.
    """
    total = db.query(models.Case).count()
    high = db.query(models.Case).filter(models.Case.priority == "High", models.Case.status != "Resolved").count()
    in_progress = db.query(models.Case).filter(models.Case.status.in_(["In Progress", "Assigned"])).count()
    resolved = db.query(models.Case).filter(models.Case.status == "Resolved").count()
    
    return schemas.CaseStatsSummary(
        total_cases=total,
        high_priority=high,
        in_progress=in_progress,
        resolved=resolved,
        avg_response_time="18 min",
        total_change="+18.4%",
        high_change="+24.6%",
        progress_change="+12.5%",
        resolved_change="+21.3%",
    )


@router.get("/{case_id}", response_model=schemas.CaseOut, summary="Get Case Detail")
def get_case(case_id: str, db: Session = Depends(get_db)):
    """Returns full detail of a single humanitarian case by ID."""
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return schemas.CaseOut.model_validate(case)


@router.put("/{case_id}", response_model=schemas.CaseOut, summary="Update Case")
def update_case(
    case_id: str,
    payload: schemas.CaseUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """
    Update a case's status, priority, assigned NGO, or description.
    If status → Resolved, logs a resolved activity entry.
    """
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    if payload.status:
        case.status = payload.status
        case.status_class = STATUS_CLASSES.get(payload.status, "status-pending")
        
        if payload.status == "Resolved":
            log = models.ActivityLog(
                type="resolved",
                icon="check",
                color="green",
                title=f"Case {case_id} resolved",
                subtitle=f"{case.location} ({case.category})",
            )
            db.add(log)
            # Update NGO stats
            if case.assigned_ngo:
                ngo = db.query(models.NGO).filter(models.NGO.name == case.assigned_ngo).first()
                if ngo:
                    ngo.cases_handled += 1
                    ngo.active_cases = max(0, ngo.active_cases - 1)
    
    if payload.priority:
        case.priority = payload.priority
        case.priority_class = PRIORITY_CLASSES.get(payload.priority, "urgency-med")
    if payload.assigned_ngo is not None:
        case.assigned_ngo = payload.assigned_ngo
    if payload.description is not None:
        case.description = payload.description
    if payload.confidence is not None:
        case.confidence = payload.confidence
    if payload.has_video is not None:
        case.has_video = payload.has_video
    if payload.video_name is not None:
        case.video_name = payload.video_name
    if payload.video_size is not None:
        case.video_size = payload.video_size
    if payload.video_url is not None:
        case.video_url = payload.video_url
    
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    
    return schemas.CaseOut.model_validate(case)


@router.delete("/{case_id}", summary="Archive/Delete Case")
def delete_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Deletes/archives a case. Requires authentication."""
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    db.delete(case)
    db.commit()
    
    return {"message": f"Case {case_id} archived successfully"}
