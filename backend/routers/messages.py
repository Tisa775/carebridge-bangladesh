"""
CareBridge Bangladesh – Messages Router
Field command messaging between coordinators and field units.
"""

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, get_optional_user
import models, schemas

router = APIRouter(prefix="/api/messages", tags=["Messages"])


def time_label(dt: datetime) -> str:
    """Returns human-readable time label."""
    delta = datetime.utcnow() - dt
    minutes = int(delta.total_seconds() / 60)
    if minutes < 1:
        return "Just now"
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    return dt.strftime("%b %d")


@router.get("/threads", response_model=List[schemas.ThreadOut], summary="List Message Threads")
def get_threads(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns all distinct chat thread partners for the current user.
    Shows last message and unread count per thread.
    """
    # Get all users who have exchanged messages with current user
    sent = db.query(models.Message).filter(models.Message.sender_id == current_user.id).all()
    received = db.query(models.Message).filter(models.Message.receiver_id == current_user.id).all()
    
    partner_ids = set()
    for msg in sent:
        partner_ids.add(msg.receiver_id)
    for msg in received:
        partner_ids.add(msg.sender_id)
    
    threads = []
    for partner_id in partner_ids:
        partner = db.query(models.User).filter(models.User.id == partner_id).first()
        if not partner:
            continue
        
        # Get last message in this thread
        last_msg = db.query(models.Message).filter(
            (
                (models.Message.sender_id == current_user.id) & (models.Message.receiver_id == partner_id)
            ) | (
                (models.Message.sender_id == partner_id) & (models.Message.receiver_id == current_user.id)
            )
        ).order_by(models.Message.timestamp.desc()).first()
        
        # Count unread from partner
        unread = db.query(models.Message).filter(
            models.Message.sender_id == partner_id,
            models.Message.receiver_id == current_user.id,
            models.Message.is_read == False
        ).count()
        
        if last_msg:
            threads.append(schemas.ThreadOut(
                partner_id=partner_id,
                partner_name=partner.name,
                partner_avatar=partner.avatar,
                last_message=last_msg.content[:80],
                last_time=last_msg.timestamp,
                unread_count=unread,
            ))
    
    # Sort by last message time
    threads.sort(key=lambda t: t.last_time, reverse=True)
    return threads


@router.get("/thread/{partner_id}", response_model=List[schemas.MessageOut], summary="Get Conversation")
def get_conversation(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns all messages in a conversation with a specific partner."""
    messages = db.query(models.Message).filter(
        (
            (models.Message.sender_id == current_user.id) & (models.Message.receiver_id == partner_id)
        ) | (
            (models.Message.sender_id == partner_id) & (models.Message.receiver_id == current_user.id)
        )
    ).order_by(models.Message.timestamp.asc()).all()
    
    # Mark received messages as read
    db.query(models.Message).filter(
        models.Message.sender_id == partner_id,
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    return [schemas.MessageOut.model_validate(m) for m in messages]


@router.post("/send", response_model=schemas.MessageOut, status_code=201, summary="Send Message")
def send_message(
    payload: schemas.MessageSend,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Send a message to another user (field unit, NGO coordinator, etc.)."""
    receiver = db.query(models.User).filter(models.User.id == payload.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    msg = models.Message(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        content=payload.content,
        is_read=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    return schemas.MessageOut.model_validate(msg)


@router.get("/unread/count", summary="Unread Message Count")
def unread_message_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns total unread message count for the current user."""
    count = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False
    ).count()
    return {"unread": count}
