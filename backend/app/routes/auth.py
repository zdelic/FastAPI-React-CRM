from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core import security
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter()
bearer = HTTPBearer()

# ---------- CURRENT USER ----------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # kompatibilnost: sub može biti ID ili email
    user: User | None = None
    try:
        user_id = int(sub)
        user = db.get(User, user_id)
    except (ValueError, TypeError):
        user = db.query(User).filter(User.email == str(sub)).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ---------- LOGIN (JSON) ----------
class LoginJSON(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Prihvata:
    - JSON: {"email": "...", "password": "..."} ili {"username": "...", "password": "..."}
    - form-data / x-www-form-urlencoded: email/username + password
    """
    email = None
    password = None

    ct = (request.headers.get("content-type") or "").lower()
    try:
        if "application/x-www-form-urlencoded" in ct or "multipart/form-data" in ct:
            form = await request.form()
            email = form.get("email") or form.get("username")
            password = form.get("password")
        else:
            data = await request.json()
            email = data.get("email") or data.get("username")
            password = data.get("password")
    except Exception:
        # ako body nije ni form ni json
        pass

    if not email or not password:
        raise HTTPException(status_code=422, detail="email/username i password su obavezni")

    user = db.query(User).filter(User.email == email).first()
    if not user or not security.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # ubaci i id i email (radi kompatibilnosti s get_current_user)
    token = security.create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

# ---------- LOGIN (FORM-DATA, OAuth2 kompatibilno) ----------
@router.post("/login-form")
def login_form(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 koristi form.username → kod nas je to email
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not security.verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = security.create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

# ---------- /me ----------
from app.schemas.user import UserRead
@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)):
    return current
