# app/audit.py
import json, time
from uuid import uuid4
from typing import Iterable, Optional, Callable
from fastapi import Request, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.routes.auth import get_current_user  # vraća User
from app.models.user import User

def _ctx(request: Request) -> dict:
    return {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "path": request.url.path,
        "method": request.method,
        "request_id": request.headers.get("x-request-id") or str(uuid4()),
    }

def _write(
    db: Session, *, user_id: Optional[int], action: str,
    object_type: Optional[str], object_id: Optional[int],
    object_ids: Optional[Iterable[int]], success: bool,
    status_code: Optional[int], ctx: dict
):
    db.execute(
        text("""
        INSERT INTO audit_logs
          (user_id, action, object_type, object_id, object_ids, success,
           status_code, ip, user_agent, method, path, request_id, meta)
        VALUES
          (:user_id, :action, :object_type, :object_id, :object_ids, :success,
           :status_code, :ip, :user_agent, :method, :path, :request_id, :meta)
        """),
        {
            "user_id": user_id,
            "action": action,
            "object_type": object_type,
            "object_id": object_id,
            "object_ids": json.dumps(list(object_ids)) if object_ids else None,
            "success": 1 if success else 0,
            "status_code": status_code,
            "ip": ctx.get("ip"),
            "user_agent": ctx.get("user_agent"),
            "method": ctx.get("method"),
            "path": ctx.get("path"),
            "request_id": ctx.get("request_id"),
            "meta": None,
        }
    )

# Ruta može postaviti koje objekte je dirala:
def set_audit_objects(request: Request, ids: Iterable[int] | None, object_id: int | None = None):
    request.state.audit_object_ids = list(ids) if ids is not None else None
    request.state.audit_object_id = object_id

# Dependency koji radi "poslije rute"
def audit_dep(action: Optional[str] = None, object_type: Optional[str] = None) -> Callable:
    async def _dep(
        request: Request,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_current_user),
    ):
        ctx = _ctx(request)
        try:
            # pusti rutu
            yield
            success, status = True, getattr(request.state, "response_status", None) or 200
        except Exception:
            success, status = False, 500
            raise
        finally:
            obj_id  = getattr(request.state, "audit_object_id", None)
            obj_ids = getattr(request.state, "audit_object_ids", None)
            act = action or f"{request.method} {request.url.path}"
            _write(
                db,
                user_id=(current_user.id if current_user else None),
                action=act,
                object_type=object_type,
                object_id=obj_id,
                object_ids=obj_ids,
                success=success,
                status_code=status,
                ctx=ctx,
            )
            db.commit()
    return _dep
