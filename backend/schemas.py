"""
CareBridge Bangladesh – Pydantic Schemas
Request/response validation models for all API endpoints.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ─── AUTH ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    organization: Optional[str] = None
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    avatar: str
    phone: Optional[str] = None
    organization: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── CASES ───────────────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    category: str
    location: str
    priority: str = "Medium"
    description: Optional[str] = None
    reporter: Optional[str] = None
    contact: Optional[str] = None
    assigned_ngo: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    photo: Optional[str] = None

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_ngo: Optional[str] = None
    description: Optional[str] = None
    confidence: Optional[str] = None

class CaseOut(BaseModel):
    id: str
    category: str
    icon: str
    location: str
    priority: str
    priority_class: str
    status: str
    status_class: str
    confidence: str
    description: Optional[str] = None
    reporter: Optional[str] = None
    contact: Optional[str] = None
    assigned_ngo: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    distance: Optional[str] = None
    photo: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CaseStatsSummary(BaseModel):
    total_cases: int
    high_priority: int
    in_progress: int
    resolved: int
    avg_response_time: str
    total_change: str
    high_change: str
    progress_change: str
    resolved_change: str


# ─── NGOS ────────────────────────────────────────────────────────────────────

class NGOCreate(BaseModel):
    name: str
    bureau_id: Optional[str] = None
    coverage_area: Optional[str] = None
    capacity: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    is_trusted: Optional[bool] = True
    verified_status: Optional[str] = "Verified"

class NGOUpdate(BaseModel):
    verified_status: Optional[str] = None
    description: Optional[str] = None
    coverage_area: Optional[str] = None
    capacity: Optional[str] = None
    rating: Optional[float] = None

class NGOOut(BaseModel):
    id: int
    name: str
    bureau_id: Optional[str] = None
    coverage_area: Optional[str] = None
    capacity: Optional[str] = None
    description: Optional[str] = None
    verified_status: str
    rating: float
    active_cases: int
    cases_handled: int
    logo_color: str
    initials: Optional[str] = None
    is_trusted: bool
    contact_email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── VOLUNTEERS ──────────────────────────────────────────────────────────────

class VolunteerCreate(BaseModel):
    name: str
    skills: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    ngo_id: Optional[int] = None

class VolunteerOut(BaseModel):
    id: int
    name: str
    skills: Optional[str] = None
    location: Optional[str] = None
    status: str
    completed_missions: int
    avatar: Optional[str] = None
    phone: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── ALERTS ──────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str = "Medium"
    source: Optional[str] = None
    related_case_id: Optional[str] = None
    alert_type: str = "general"

class AlertOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    severity: str
    source: Optional[str] = None
    is_read: bool
    related_case_id: Optional[str] = None
    alert_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── MESSAGES ────────────────────────────────────────────────────────────────

class MessageSend(BaseModel):
    receiver_id: int
    content: str

class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    timestamp: datetime

    class Config:
        from_attributes = True

class ThreadOut(BaseModel):
    partner_id: int
    partner_name: str
    partner_avatar: Optional[str] = None
    last_message: str
    last_time: datetime
    unread_count: int


# ─── ANALYTICS ───────────────────────────────────────────────────────────────

class MapHotspot(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    count: int
    type: str
    priority: str
    desc: str

class SinglePin(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    type: str
    priority: str

class CaseQueueItem(BaseModel):
    id: str
    title: str
    location: str
    distance: str
    time: str
    priority: str
    priority_label: str
    ai_confidence: int
    category: str
    photo: str
    description: str
    reporter: Optional[str] = None
    contact: Optional[str] = None
    assigned_ngo: Optional[str] = None

class ActivityItem(BaseModel):
    id: int
    type: str
    icon: str
    color: str
    title: str
    subtitle: Optional[str] = None
    time: str

class TrustedOrg(BaseModel):
    name: str
    cases: str
    rating: float
    logo_color: str
    initials: str

class DashboardData(BaseModel):
    map_hotspots: List[MapHotspot]
    single_pins: List[SinglePin]
    case_queue: List[CaseQueueItem]
    live_activity: List[ActivityItem]
    trusted_organizations: List[TrustedOrg]

class ResponseTimeData(BaseModel):
    labels: List[str]
    data: List[float]

class DivisionalRow(BaseModel):
    division: str
    cases: int
    resolution: str
    avg_dispatch: str

class CategoryShare(BaseModel):
    label: str
    icon: str
    icon_color: str
    percent: int
    count: int


# ─── AI ──────────────────────────────────────────────────────────────────────

class AIChatRequest(BaseModel):
    query: str

class AIChatResponse(BaseModel):
    reply: str

class AIInsight(BaseModel):
    hotspot_zone: str
    hotspot_change: str
    hotspot_recommendation: str
    triage_accuracy: str
    response_improvement: str
    most_reported_category: str
    most_reported_percent: str
    avg_response_time: str
    avg_response_change: str


# ─── ACTIVITY LOG ────────────────────────────────────────────────────────────

class ActivityLogOut(BaseModel):
    id: int
    type: str
    icon: str
    color: str
    title: str
    subtitle: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
