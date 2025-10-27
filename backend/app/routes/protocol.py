from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.models.protocol import ProtocolEntry

router = APIRouter(prefix="/api/audit-logs", tags=["protocol"])

@router.get("")
def list_protocol(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    ok: Optional[bool] = None,
    method: Optional[str] = None,
    path: Optional[str] = None,
    status_code: Optional[int] = Query(None, ge=100, le=599),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    qy = db.query(ProtocolEntry)
    if action:      qy = qy.filter(ProtocolEntry.action.ilike(f"%{action}%"))
    if user_id:     qy = qy.filter(ProtocolEntry.user_id == user_id)
    if ok is not None: qy = qy.filter(ProtocolEntry.ok == ok)
    if method:      qy = qy.filter(ProtocolEntry.method == method.upper())
    if path:        qy = qy.filter(ProtocolEntry.path.ilike(f"%{path}%"))
    if status_code: qy = qy.filter(ProtocolEntry.status_code == status_code)
    if from_:
        try: qy = qy.filter(ProtocolEntry.timestamp >= datetime.fromisoformat(from_))
        except: pass
    if to:
        try: qy = qy.filter(ProtocolEntry.timestamp <= datetime.fromisoformat(to))
        except: pass
    if q:
        pat = f"%{q}%"
        qy = qy.filter((ProtocolEntry.path.ilike(pat)) | (ProtocolEntry.user_agent.ilike(pat)))

    total = qy.count()
    rows = (qy.order_by(ProtocolEntry.timestamp.desc())
              .offset((page-1)*page_size)
              .limit(page_size)
              .all())

    def ser(r: ProtocolEntry):
        return {
            "id": r.id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "user_id": r.user_id,
            "user_name": r.user_name,
            "action": r.action,
            "ok": r.ok,
            "method": r.method,
            "path": r.path,
            "status_code": r.status_code,
            "ip": r.ip,
            "user_agent": r.user_agent,
            "details": r.details,  # već JSONable
        }

    return {"items": [ser(r) for r in rows], "total": total}
