"""
CareBridge Bangladesh – Auth Router
Handles user login, signup, token validation, and logout.
Uses bcrypt password hashing + JWT tokens for stateless auth.
"""

from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import bcrypt

from database import get_db
import models, schemas

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ─── Security Config ─────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "carebridge-bangladesh-secret-key-2026-humanitarian")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) // 60

bearer_scheme = HTTPBearer(auto_error=False)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))
    except Exception:
        return False

def hash_password(plain: str) -> str:
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ─── Dependency: Get Current User ────────────────────────────────────────────

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    
    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Returns user if authenticated, None otherwise (for public routes)."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return db.query(models.User).filter(models.User.id == payload.get("sub")).first()


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/login", response_model=schemas.AuthResponse, summary="Sign In")
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user with email + password.
    Returns JWT token and user profile.
    Demo credentials: argho@carebridge.org / demo123
    """
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    
    return schemas.AuthResponse(
        access_token=token,
        user=schemas.UserOut.model_validate(user)
    )


@router.post("/signup", response_model=schemas.AuthResponse, status_code=201, summary="Create Account")
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new CareBridge account.
    Auto-logs in on success returning a JWT token.
    """
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
    
    full_name = f"{payload.first_name} {payload.last_name}".strip()
    new_user = models.User(
        name=full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="Field Volunteer / Coordinator",
        phone=payload.phone,
        organization=payload.organization,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log signup activity
    log = models.ActivityLog(
        type="user",
        icon="user",
        color="blue",
        title=f"New account registered",
        subtitle=f"{full_name} joined CareBridge",
    )
    db.add(log)
    db.commit()
    
    token = create_access_token({"sub": str(new_user.id), "email": new_user.email, "role": new_user.role})
    
    return schemas.AuthResponse(
        access_token=token,
        user=schemas.UserOut.model_validate(new_user)
    )


@router.get("/me", response_model=schemas.UserOut, summary="Get Current User")
def get_me(current_user: models.User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return schemas.UserOut.model_validate(current_user)


@router.post("/logout", summary="Sign Out")
def logout(current_user: models.User = Depends(get_current_user)):
    """
    Logs out the user. Since we use stateless JWT, the client should
    discard the token. Server-side, we just acknowledge.
    """
    return {"message": f"Goodbye {current_user.name}! Session ended successfully."}
