# app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.schemas.user import UserRead
from app.database import get_db
from app.models.user import User
from app.core import security
from app.deps import get_current_user  # koristimo centralnu varijantu iz deps
from app.core.protocol import log_protocol

router = APIRouter()

# ---------- LOGIN (JSON ili form-data u istom endpointu) ----------
class LoginJSON(BaseModel):
    email: str | None = None
    username: str | None = None
    password: str

@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Prihvata:
      - JSON: {"email": "...", "password": "..."} ili {"username": "...", "password": "..."}
      - form-data / x-www-form-urlencoded: email/username + password
    """
    email_or_username = None
    password = None

    ct = (request.headers.get("content-type") or "").lower()
    try:
        if "application/x-www-form-urlencoded" in ct or "multipart/form-data" in ct:
            form = await request.form()
            email_or_username = form.get("email") or form.get("username")
            password = form.get("password")
        else:
            data = await request.json()
            email_or_username = data.get("email") or data.get("username")
            password = data.get("password")
    except Exception:
        # body nije ni form ni json
        pass

    if not email_or_username or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="E-Mail/Benutzername und Passwort sind erforderlich",
        )

    # kod tebe je korisnik identificiran po emailu, pa tražimo po emailu
    user = db.query(User).filter(User.email == email_or_username).first()

    if not user or not security.verify_password(password, user.hashed_password):
        # ❌ neuspješan login – ispravno logovanje
        log_protocol(
            db, request,
            action="auth.login", ok=False, status_code=status.HTTP_401_UNAUTHORIZED,
            details={"email": email_or_username, "reason": "invalid_credentials"},
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # ✅ uspješan login – kreiraj token
    token = security.create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role}
    )

    # i PROSLIJEDI user_id + user_name (jer nema request.state.user na auth rutama)
    log_protocol(
        db, request,
        action="auth.login", ok=True, status_code=200,
        details={"user_id": user.id, "email": user.email},
        user_id=user.id,
        user_name=(user.name or user.username or user.email),
    )

    return {"access_token": token, "token_type": "bearer"}


# ---------- LOGIN (OAuth2 form-data kompatibilno) ----------
@router.post("/login-form")
def login_form(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # OAuth2 koristi form.username → kod nas je to email
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not security.verify_password(form.password, user.hashed_password):
        log_protocol(
            db, request,
            action="auth.login", ok=False, status_code=status.HTTP_401_UNAUTHORIZED,
            details={"email": form.username, "reason": "invalid_credentials"},
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = security.create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )

    log_protocol(
        db, request,
        action="auth.login", ok=True, status_code=200,
        details={"user_id": user.id, "email": user.email},
        user_id=user.id,
        user_name=(user.name or user.username or user.email),
    )

    return {"access_token": access_token, "token_type": "bearer"}


# ---------- /me ----------
@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)):
    return current
