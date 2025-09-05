from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
import os, uuid

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserRead, UserUpdate, ROLES,
    PasswordChange, PasswordReset,
)
from app.routes.auth import get_current_user
from app.deps import require_admin
from app.core.security import verify_password, hash_password

BASE_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/users", tags=["users"])

# --- Admin-only CRUD --------------------------------------------------------

@router.get("", response_model=List[UserRead], dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db)):
    return db.execute(select(User)).scalars().all()

@router.post("", response_model=UserRead, status_code=201, dependencies=[Depends(require_admin)])
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="Email already exists")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        name=data.name,
        address=data.address,
        phone=data.phone,
        avatar_url=data.avatar_url,
    )
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.patch("/{user_id}", response_model=UserRead, dependencies=[Depends(require_admin)])
def update_user(user_id: int, patch: UserUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = patch.model_dump(exclude_unset=True)
    if "role" in data and data["role"] and data["role"] not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    for k, v in data.items():
        setattr(user, k, v)
    db.commit(); db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user); db.commit()

# --- Avatar (admin ili vlasnik) --------------------------------------------

@router.post("/{user_id}/avatar", response_model=UserRead)
async def upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(status_code=403, detail="Nicht erlaubt")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / fname
    with open(dest, "wb") as f:
        f.write(await file.read())

    user.avatar_url = f"/static/uploads/{fname}"
    db.commit(); db.refresh(user)
    return user

# --- Passwords --------------------------------------------------------------

@router.post("/{user_id}/password", status_code=204)
def change_password(
    user_id: int,
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # vlasnik ili admin
    if current.id != user_id and current.role != "admin":
        raise HTTPException(status_code=403, detail="Nicht erlaubt")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ako nije admin, mora potvrditi staru lozinku
    if current.role != "admin":
        if not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Falsches aktuelles Passwort")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return  # 204

@router.post("/{user_id}/password-reset", status_code=204, dependencies=[Depends(require_admin)])
def reset_password(user_id: int, payload: PasswordReset, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return  # 204
