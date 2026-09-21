"""
CareBridge Bangladesh – NGOs Router
NGO partner registration, verification, and profile management.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, get_optional_user
import models, schemas

router = APIRouter(prefix="/api/ngos", tags=["NGOs"])


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.NGOOut], summary="List All NGOs")
def list_ngos(
    verified: Optional[bool] = Query(None, description="Filter by verified status"),
    search: Optional[str] = Query(None, description="Search by name or area"),
    db: Session = Depends(get_db)
):
    """Returns all registered NGO partners, optionally filtered."""
    q = db.query(models.NGO)
    if verified is True:
        q = q.filter(models.NGO.verified_status == "Verified")
    elif verified is False:
        q = q.filter(models.NGO.verified_status == "Pending")
    if search:
        q = q.filter(
            models.NGO.name.ilike(f"%{search}%") |
            models.NGO.coverage_area.ilike(f"%{search}%")
        )
    ngos = q.order_by(models.NGO.rating.desc()).all()
    return [schemas.NGOOut.model_validate(n) for n in ngos]


@router.get("/pending", response_model=List[schemas.NGOOut], summary="List Pending NGOs")
def list_pending_ngos(db: Session = Depends(get_db)):
    """Returns NGOs awaiting government verification."""
    ngos = db.query(models.NGO).filter(models.NGO.verified_status == "Pending").all()
    return [schemas.NGOOut.model_validate(n) for n in ngos]


@router.get("/trusted", response_model=List[schemas.NGOOut], summary="List Trusted NGOs")
def list_trusted_ngos(db: Session = Depends(get_db)):
    """Returns the trusted partner organizations for the dashboard sidebar."""
    ngos = db.query(models.NGO).filter(
        models.NGO.is_trusted == True
    ).order_by(models.NGO.rating.desc()).limit(6).all()
    return [schemas.NGOOut.model_validate(n) for n in ngos]


@router.post("", response_model=schemas.NGOOut, status_code=201, summary="Register NGO")
def register_ngo(
    payload: schemas.NGOCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """Register a new NGO partner. Starts in Pending verification status."""
    existing = db.query(models.NGO).filter(models.NGO.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"NGO '{payload.name}' is already registered")
    
    # Generate initials from name
    words = payload.name.split()
    initials = "".join(w[0].upper() for w in words[:2]) if words else payload.name[:2].upper()
    
    # Assign a distinct color based on name hash
    colors = ["#059669", "#ec4899", "#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444", "#06b6d4"]
    color = colors[len(payload.name) % len(colors)]
    
    new_ngo = models.NGO(
        name=payload.name,
        bureau_id=payload.bureau_id,
        coverage_area=payload.coverage_area,
        capacity=payload.capacity,
        description=payload.description,
        contact_email=payload.contact_email,
        verified_status=payload.verified_status or "Verified",
        rating=5.0,
        cases_handled=0,
        active_cases=0,
        logo_color=color,
        initials=initials,
        is_trusted=payload.is_trusted if payload.is_trusted is not None else True,
    )
    db.add(new_ngo)
    
    # Log activity
    log = models.ActivityLog(
        type="ngo",
        icon="plus",
        color="blue",
        title=f"New NGO registered",
        subtitle=f"{payload.name} submitted for verification",
    )
    db.add(log)
    
    # Create alert for admin
    alert = models.Alert(
        title=f"🤝 New NGO Partner Registered - {payload.name}",
        description=f"{payload.name} submitted registration documents for review.",
        severity="Low",
        source="NGO Registration Portal",
        alert_type="general",
    )
    db.add(alert)
    
    db.commit()
    db.refresh(new_ngo)
    
    return schemas.NGOOut.model_validate(new_ngo)


@router.get("/{ngo_id}", response_model=schemas.NGOOut, summary="Get NGO Profile")
def get_ngo(ngo_id: int, db: Session = Depends(get_db)):
    """Returns a single NGO's complete profile."""
    ngo = db.query(models.NGO).filter(models.NGO.id == ngo_id).first()
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found")
    return schemas.NGOOut.model_validate(ngo)


@router.put("/{ngo_id}/verify", response_model=schemas.NGOOut, summary="Verify or Reject NGO")
def verify_ngo(
    ngo_id: int,
    payload: schemas.NGOUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Approve or reject an NGO partner.
    Sets verified_status to 'Verified' or 'Rejected' and marks trusted.
    """
    ngo = db.query(models.NGO).filter(models.NGO.id == ngo_id).first()
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found")
    
    if payload.verified_status:
        ngo.verified_status = payload.verified_status
        ngo.is_trusted = (payload.verified_status == "Verified")
        
        # Log activity
        log = models.ActivityLog(
            type="ngo",
            icon="check",
            color="green" if payload.verified_status == "Verified" else "red",
            title=f"NGO {payload.verified_status.lower()}",
            subtitle=f"{ngo.name} partner status updated",
        )
        db.add(log)
    
    if payload.description is not None:
        ngo.description = payload.description
    if payload.coverage_area is not None:
        ngo.coverage_area = payload.coverage_area
    if payload.capacity is not None:
        ngo.capacity = payload.capacity
    if payload.rating is not None:
        ngo.rating = payload.rating
    
    db.commit()
    db.refresh(ngo)
    
    return schemas.NGOOut.model_validate(ngo)
