"""
CareBridge Bangladesh – Volunteers Router
Volunteer management: listing, registration, dispatch to cases.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, get_optional_user
import models, schemas

router = APIRouter(prefix="/api/volunteers", tags=["Volunteers"])


@router.get("", response_model=List[schemas.VolunteerOut], summary="List All Volunteers")
def list_volunteers(
    status: Optional[str] = Query(None, description="Filter by status: Active, In Transit, Off Duty"),
    location: Optional[str] = Query(None, description="Filter by location area"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Returns all registered volunteers, with optional filters."""
    q = db.query(models.Volunteer)
    if status:
        q = q.filter(models.Volunteer.status == status)
    if location:
        q = q.filter(models.Volunteer.location.ilike(f"%{location}%"))
    if search:
        q = q.filter(
            models.Volunteer.name.ilike(f"%{search}%") |
            models.Volunteer.skills.ilike(f"%{search}%") |
            models.Volunteer.location.ilike(f"%{search}%")
        )
    volunteers = q.order_by(models.Volunteer.completed_missions.desc()).all()
    return [schemas.VolunteerOut.model_validate(v) for v in volunteers]


@router.post("", response_model=schemas.VolunteerOut, status_code=201, summary="Register Volunteer")
def register_volunteer(
    payload: schemas.VolunteerCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """Register a new field volunteer."""
    new_vol = models.Volunteer(
        name=payload.name,
        skills=payload.skills,
        location=payload.location,
        phone=payload.phone,
        ngo_id=payload.ngo_id,
        status="Active",
        completed_missions=0,
    )
    db.add(new_vol)
    
    log = models.ActivityLog(
        type="volunteer",
        icon="user",
        color="blue",
        title="New volunteer registered",
        subtitle=f"{payload.name} joined the field team",
    )
    db.add(log)
    db.commit()
    db.refresh(new_vol)
    
    return schemas.VolunteerOut.model_validate(new_vol)


@router.get("/{volunteer_id}", response_model=schemas.VolunteerOut, summary="Get Volunteer")
def get_volunteer(volunteer_id: int, db: Session = Depends(get_db)):
    """Returns a single volunteer's profile and stats."""
    vol = db.query(models.Volunteer).filter(models.Volunteer.id == volunteer_id).first()
    if not vol:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    return schemas.VolunteerOut.model_validate(vol)


@router.put("/{volunteer_id}/dispatch", summary="Dispatch Volunteer to Case")
def dispatch_volunteer(
    volunteer_id: int,
    case_id: str = Query(..., description="Target case ID to dispatch volunteer to"),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """
    Dispatches a volunteer to a specific case.
    Updates volunteer status to 'In Transit' and logs the dispatch.
    """
    vol = db.query(models.Volunteer).filter(models.Volunteer.id == volunteer_id).first()
    if not vol:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    vol.status = "In Transit"
    case.status = "Assigned"
    case.status_class = "status-assigned"
    
    log = models.ActivityLog(
        type="volunteer",
        icon="crosshair",
        color="orange",
        title=f"Volunteer dispatched",
        subtitle=f"{vol.name} routed to {case.location}",
    )
    db.add(log)
    
    # Create urgent alert
    alert = models.Alert(
        title=f"🚑 Volunteer Dispatched - {case_id}",
        description=f"{vol.name} dispatched to {case.location} for {case.category} case.",
        severity="Medium",
        source="Command HQ",
        related_case_id=case_id,
        alert_type="general",
    )
    db.add(alert)
    db.commit()
    
    return {
        "message": f"Volunteer {vol.name} dispatched to case {case_id} at {case.location}",
        "volunteer_status": vol.status,
        "case_status": case.status,
    }
