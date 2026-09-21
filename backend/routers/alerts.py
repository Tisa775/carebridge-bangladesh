"""
CareBridge Bangladesh – Alerts Router
Emergency alerts and SOS broadcasts. Supports read/unread state management.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, get_optional_user
import models, schemas

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=List[schemas.AlertOut], summary="List All Alerts")
def list_alerts(
    unread_only: bool = False,
    db: Session = Depends(get_db)
):
    """Returns alerts ordered by severity and time. Unread first."""
    q = db.query(models.Alert)
    if unread_only:
        q = q.filter(models.Alert.is_read == False)
    
    # Order: unread first, then by created_at desc
    alerts = q.order_by(
        models.Alert.is_read.asc(),
        models.Alert.created_at.desc()
    ).all()
    return [schemas.AlertOut.model_validate(a) for a in alerts]


@router.post("", response_model=schemas.AlertOut, status_code=201, summary="Create Emergency Alert / SOS")
def create_alert(
    payload: schemas.AlertCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """
    Create an emergency alert or SOS.
    If alert_type='sos' and severity='Critical', logs a high-priority activity event.
    """
    new_alert = models.Alert(
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        source=payload.source or (current_user.name if current_user else "Field Command"),
        related_case_id=payload.related_case_id,
        alert_type=payload.alert_type,
        is_read=False,
    )
    db.add(new_alert)
    
    # Log to activity feed
    color = "red" if payload.severity in ("Critical", "High") else "orange"
    icon = "crosshair" if payload.alert_type == "sos" else "plus"
    log = models.ActivityLog(
        type="rescue" if payload.alert_type == "sos" else "report",
        icon=icon,
        color=color,
        title=payload.title[:100],
        subtitle=payload.description[:150] if payload.description else None,
    )
    db.add(log)
    db.commit()
    db.refresh(new_alert)
    
    return schemas.AlertOut.model_validate(new_alert)


# ─── Static-path routes MUST come before parameterized /{alert_id} routes ────

@router.put("/read-all", summary="Mark All Alerts as Read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_user)
):
    """Marks all alerts as read."""
    db.query(models.Alert).filter(models.Alert.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All alerts marked as read"}


@router.get("/count/unread", summary="Unread Alert Count")
def unread_count(db: Session = Depends(get_db)):
    """Returns the count of unread alerts for notification badges."""
    count = db.query(models.Alert).filter(models.Alert.is_read == False).count()
    return {"unread": count}


@router.put("/{alert_id}/read", response_model=schemas.AlertOut, summary="Mark Alert as Read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    """Marks a specific alert as read."""
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return schemas.AlertOut.model_validate(alert)
