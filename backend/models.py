"""
CareBridge Bangladesh – SQLAlchemy ORM Models
All database tables for the humanitarian aid platform.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(100), default="Field Volunteer")
    avatar = Column(String(500), default="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80")
    phone = Column(String(30), nullable=True)
    organization = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")


class Case(Base):
    __tablename__ = "cases"

    id = Column(String(20), primary_key=True, index=True)  # e.g. CB-12482
    category = Column(String(50), nullable=False)  # Child, Elderly, Medical, etc.
    icon = Column(String(50), default="fa-circle-dot")
    location = Column(String(200), nullable=False)
    priority = Column(String(20), default="Medium")  # High, Medium, Low
    priority_class = Column(String(30), default="urgency-med")
    status = Column(String(30), default="Pending")  # Pending, In Progress, Assigned, Resolved
    status_class = Column(String(30), default="status-pending")
    confidence = Column(String(10), default="85%")  # AI Confidence
    description = Column(Text, nullable=True)
    reporter = Column(String(150), nullable=True)
    contact = Column(String(50), nullable=True)
    assigned_ngo = Column(String(150), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    distance = Column(String(30), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    photo = Column(String(500), nullable=True)


class NGO(Base):
    __tablename__ = "ngos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    bureau_id = Column(String(50), nullable=True)  # Government Bureau ID
    coverage_area = Column(String(200), nullable=True)
    capacity = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    verified_status = Column(String(20), default="Pending")  # Pending, Verified, Rejected
    rating = Column(Float, default=0.0)
    active_cases = Column(Integer, default=0)
    cases_handled = Column(Integer, default=0)
    logo_color = Column(String(20), default="#059669")
    initials = Column(String(5), nullable=True)
    is_trusted = Column(Boolean, default=False)
    contact_email = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Volunteer(Base):
    __tablename__ = "volunteers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    skills = Column(String(500), nullable=True)
    location = Column(String(150), nullable=True)
    status = Column(String(30), default="Active")  # Active, In Transit, Off Duty
    completed_missions = Column(Integer, default=0)
    ngo_id = Column(Integer, ForeignKey("ngos.id"), nullable=True)
    avatar = Column(String(500), nullable=True)
    phone = Column(String(30), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ngo = relationship("NGO")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="Medium")  # Critical, High, Medium, Low, Info
    source = Column(String(150), nullable=True)
    is_read = Column(Boolean, default=False)
    related_case_id = Column(String(20), nullable=True)
    alert_type = Column(String(30), default="general")  # sos, verified, general
    created_at = Column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(30), nullable=False)  # report, ngo, volunteer, rescue, resolved
    icon = Column(String(30), default="plus")  # plus, check, user, crosshair
    color = Column(String(20), default="green")  # red, green, blue, orange
    title = Column(String(300), nullable=False)
    subtitle = Column(String(300), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
