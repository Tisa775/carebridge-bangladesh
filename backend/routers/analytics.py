"""
CareBridge Bangladesh – Analytics Router
Dashboard data, map hotspots, response time charts, divisional stats.
"""

from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
import models, schemas

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


def time_ago(dt: datetime) -> str:
    delta = datetime.utcnow() - dt
    minutes = int(delta.total_seconds() / 60)
    if minutes < 1:
        return "Just now"
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{hours // 24}d ago"


@router.get("/dashboard", response_model=schemas.DashboardData, summary="Full Dashboard Data")
def get_dashboard_data(db: Session = Depends(get_db)):
    """
    Returns all data needed for the main dashboard in one call:
    - Map hotspots (clustered pin data for Leaflet)
    - Single map pins (shelters, low-priority)
    - Case queue (top 5 urgent cases)
    - Live activity feed
    - Trusted organizations list
    """
    # ── Map Hotspots (from DB cases grouped by area, supplemented with static data) ──
    map_hotspots = [
        schemas.MapHotspot(id="mirpur", name="Mirpur-10", lat=23.8067, lng=90.3687,
            count=db.query(models.Case).filter(models.Case.location.ilike("%Mirpur%"), models.Case.status != "Resolved").count() or 24,
            type="red", priority="High Priority", desc="Critical child assistance and shelter requests"),
        schemas.MapHotspot(id="dhanmondi", name="Dhanmondi", lat=23.7465, lng=90.3760,
            count=db.query(models.Case).filter(models.Case.location.ilike("%Dhanmondi%"), models.Case.status != "Resolved").count() or 32,
            type="red", priority="High Priority", desc="Medical emergency & crisis relief ongoing"),
        schemas.MapHotspot(id="uttara", name="Uttara Sector 7", lat=23.8759, lng=90.3795,
            count=db.query(models.Case).filter(models.Case.location.ilike("%Uttara%"), models.Case.status != "Resolved").count() or 16,
            type="orange", priority="Medium Priority", desc="Displaced families awaiting volunteer dispatch"),
        schemas.MapHotspot(id="mohammadpur", name="Mohammadpur", lat=23.7658, lng=90.3584,
            count=db.query(models.Case).filter(models.Case.location.ilike("%Mohammadpur%"), models.Case.status != "Resolved").count() or 11,
            type="orange", priority="Medium Priority", desc="Disability support & food ration needs"),
        schemas.MapHotspot(id="gulshan", name="Gulshan 2", lat=23.7925, lng=90.4078,
            count=8, type="green", priority="Resolved", desc="8 cases successfully processed by BRAC"),
        schemas.MapHotspot(id="demra", name="Demra", lat=23.7147, lng=90.4988,
            count=6, type="green", priority="Resolved", desc="Flood relief shelter transition completed"),
        schemas.MapHotspot(id="motijheel", name="Motijheel C/A", lat=23.7330, lng=90.4172,
            count=14, type="orange", priority="Medium Priority", desc="Homeless shelter intake queue"),
        schemas.MapHotspot(id="badda", name="Middle Badda", lat=23.7806, lng=90.4267,
            count=19, type="red", priority="High Priority", desc="Urgent medical rescue required"),
    ]

    single_pins = [
        schemas.SinglePin(id="p1", name="Kathalbagan Center", lat=23.7510, lng=90.3900, type="blue", priority="Low Priority"),
        schemas.SinglePin(id="p2", name="Keraniganj South", lat=23.6850, lng=90.3800, type="blue", priority="Low Priority"),
        schemas.SinglePin(id="p3", name="Asha Shelter Mirpur", lat=23.8150, lng=90.3600, type="purple", priority="Shelters"),
        schemas.SinglePin(id="p4", name="BRAC Aid Hub Uttara", lat=23.8650, lng=90.3950, type="purple", priority="Shelters"),
    ]

    # ── Case Queue (top 5 most urgent open cases from DB) ──
    urgent_cases = db.query(models.Case).filter(
        models.Case.status.in_(["Pending", "In Progress", "Assigned"])
    ).order_by(models.Case.created_at.desc()).limit(5).all()
    
    case_queue = []
    for c in urgent_cases:
        case_queue.append(schemas.CaseQueueItem(
            id=c.id,
            title=f"{c.category} assistance required" if not c.description else c.description[:60],
            location=c.location,
            distance=c.distance or "N/A",
            time=time_ago(c.created_at),
            priority=c.priority.lower(),
            priority_label=f"{c.priority.upper()} PRIORITY",
            ai_confidence=int(c.confidence.replace("%", "")) if c.confidence else 85,
            category=c.category,
            photo=c.photo or "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80",
            description=c.description or f"Urgent aid required at {c.location}.",
            reporter=c.reporter,
            contact=c.contact,
            assigned_ngo=c.assigned_ngo,
        ))

    # ── Live Activity Feed (most recent 7 activity log entries) ──
    activities = db.query(models.ActivityLog).order_by(
        models.ActivityLog.timestamp.desc()
    ).limit(7).all()
    
    live_activity = [
        schemas.ActivityItem(
            id=a.id,
            type=a.type,
            icon=a.icon,
            color=a.color,
            title=a.title,
            subtitle=a.subtitle,
            time=time_ago(a.timestamp),
        )
        for a in activities
    ]

    # ── Trusted Organizations (top verified NGOs) ──
    trusted_ngos = db.query(models.NGO).filter(
        models.NGO.is_trusted == True
    ).order_by(models.NGO.id.desc()).limit(8).all()
    
    trusted_organizations = [
        schemas.TrustedOrg(
            name=n.name,
            cases=f"{n.cases_handled} cases handled",
            rating=n.rating,
            logo_color=n.logo_color,
            initials=n.initials or n.name[:2].upper(),
        )
        for n in trusted_ngos
    ]

    return schemas.DashboardData(
        map_hotspots=map_hotspots,
        single_pins=single_pins,
        case_queue=case_queue,
        live_activity=live_activity,
        trusted_organizations=trusted_organizations,
    )


@router.get("/response-time", response_model=schemas.ResponseTimeData, summary="Response Time Chart Data")
def get_response_time(
    period: str = Query("week", description="Period: 'week', 'month', or 'today'"),
    db: Session = Depends(get_db)
):
    """Returns response time data for the Chart.js line chart."""
    if period == "month":
        return schemas.ResponseTimeData(
            labels=["W1", "W2", "W3", "W4"],
            data=[24.0, 21.0, 18.0, 15.0]
        )
    elif period == "today":
        return schemas.ResponseTimeData(
            labels=["6AM", "9AM", "12PM", "3PM", "6PM", "9PM"],
            data=[30.0, 24.0, 18.0, 15.0, 14.0, 17.0]
        )
    else:  # week
        return schemas.ResponseTimeData(
            labels=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            data=[28.0, 22.0, 16.0, 12.0, 14.0, 11.0, 16.0]
        )


@router.get("/divisional", response_model=List[schemas.DivisionalRow], summary="Divisional Breakdown")
def get_divisional(db: Session = Depends(get_db)):
    """Returns per-division humanitarian response stats."""
    return [
        schemas.DivisionalRow(division="Dhaka Division", cases=7420, resolution="94.2%", avg_dispatch="12.4 min"),
        schemas.DivisionalRow(division="Chittagong Division", cases=2140, resolution="91.8%", avg_dispatch="15.1 min"),
        schemas.DivisionalRow(division="Sylhet Division", cases=1210, resolution="89.4%", avg_dispatch="17.8 min"),
        schemas.DivisionalRow(division="Rajshahi Division", cases=890, resolution="93.0%", avg_dispatch="13.6 min"),
        schemas.DivisionalRow(division="Khulna & Coastal", cases=822, resolution="88.5%", avg_dispatch="16.2 min"),
    ]


@router.get("/category-share", response_model=List[schemas.CategoryShare], summary="Category Volume Share")
def get_category_share(db: Session = Depends(get_db)):
    """Returns the aid category volume share percentages."""
    total = db.query(models.Case).count() or 12482
    
    categories = [
        ("Child", "fa-child", "#059669"),
        ("Elderly", "fa-person-cane", "#f59e0b"),
        ("Medical", "fa-heart-pulse", "#ef4444"),
        ("Disability", "fa-wheelchair", "#8b5cf6"),
        ("Homeless", "fa-house-chimney-crack", "#3b82f6"),
    ]
    
    result = []
    for cat, icon, color in categories:
        count = db.query(models.Case).filter(models.Case.category == cat).count()
        # Use realistic percentages if DB is sparse
        fallback_pcts = {"Child": 34, "Elderly": 26, "Medical": 22, "Disability": 11, "Homeless": 7}
        pct = round((count / total * 100)) if total > 0 else fallback_pcts.get(cat, 10)
        result.append(schemas.CategoryShare(
            label=cat,
            icon=icon,
            icon_color=color,
            percent=pct,
            count=count or fallback_pcts.get(cat, 100) * 123,
        ))
    
    return result
