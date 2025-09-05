from fastapi import Depends, HTTPException, status
from app.routes.auth import get_current_user
from app.models.user import User

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
