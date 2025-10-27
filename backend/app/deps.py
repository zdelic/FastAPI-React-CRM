from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.security import SECRET_KEY, ALGORITHM

optional_bearer = HTTPBearer(auto_error=False)
bearer = HTTPBearer()

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

    # sub može biti ID ili email
    try:
        user_id = int(sub)
        user = db.get(User, user_id)
    except (ValueError, TypeError):
        user = db.query(User).filter(User.email == str(sub)).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            return None
    except JWTError:
        return None

    try:
        user_id = int(sub)
        user = db.get(User, user_id)
    except (ValueError, TypeError):
        user = db.query(User).filter(User.email == str(sub)).first()

    return user  # može biti None

# 🔗 Binderi koji pune request.state.user (A varijanta)
def bind_user(request: Request, current: User = Depends(get_current_user)):
    request.state.user = current
    return current  # opcionalno

def bind_user_optional(request: Request, current: User | None = Depends(get_current_user_optional)):
    if current:
        request.state.user = current
    return current

def role_required(*allowed_roles: str):
    def checker(current: User = Depends(get_current_user)):
        if current.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nicht erlaubt (nur: " + ", ".join(allowed_roles) + ")",
            )
        return current
    return checker

require_admin = role_required("admin")
require_admin_or_bauleiter = role_required("admin", "bauleiter")
