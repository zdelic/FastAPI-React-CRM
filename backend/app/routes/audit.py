from fastapi import APIRouter, Depends, Query, Response, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime
import csv, io, json

from app.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User as UserModel
from app.models.project import Project as ProjectModel
from app.models.task import Task as TaskModel
from app.models.structure import Top, Ebene, Stiege, Bauteil
from app.models.process import ProcessStep
import re


def require_admin(current_user: UserModel = Depends(get_current_user)):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Nur Administratoren.")
    return current_user

router = APIRouter(
    prefix="/audit-logs",
    tags=["audit"],
    dependencies=[Depends(require_admin)],  # ⚠️ samo admin
)

def _build_where(
    user_id: Optional[int], action: Optional[str], method: Optional[str],
    path_like: Optional[str], success: Optional[bool], object_type: Optional[str],
    object_id: Optional[int], request_id: Optional[str], status_min: Optional[int],
    status_max: Optional[int], date_from: Optional[str], date_to: Optional[str]
):
    where = []
    params = {}

    if user_id is not None:
        where.append("user_id = :user_id")
        params["user_id"] = user_id
    if action:
        where.append("action LIKE :action")
        params["action"] = f"%{action}%"
    if method:
        where.append("method = :method")
        params["method"] = method.upper()
    if path_like:
        where.append("path LIKE :path_like")
        params["path_like"] = f"%{path_like}%"
    if success is not None:
        where.append("success = :success")
        params["success"] = 1 if success else 0
    if object_type:
        where.append("object_type = :object_type")
        params["object_type"] = object_type
    if object_id is not None:
        where.append("object_id = :object_id")
        params["object_id"] = object_id
    if request_id:
        where.append("request_id = :request_id")
        params["request_id"] = request_id
    if status_min is not None:
        where.append("status_code >= :status_min")
        params["status_min"] = status_min
    if status_max is not None:
        where.append("status_code <= :status_max")
        params["status_max"] = status_max
    # datumi su TEXT u SQLite – format "YYYY-MM-DD" je dovoljan
    if date_from:
        where.append("substr(ts, 1, 10) >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where.append("substr(ts, 1, 10) <= :date_to")
        params["date_to"] = date_to

    sql = " WHERE " + " AND ".join(where) if where else ""
    return sql, params

@router.get("")
def list_audit_logs(
    db: Session = Depends(get_db),
    # filteri
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    method: Optional[str] = None,
    path_like: Optional[str] = Query(None, alias="path"),
    success: Optional[bool] = None,
    object_type: Optional[str] = None,
    object_id: Optional[int] = None,
    request_id: Optional[str] = None,
    status_min: Optional[int] = None,
    status_max: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    # sortiranje & paginacija
    sort: str = "-ts",
    page: int = 1,
    page_size: int = 50,
    # izvoz
    format: Optional[str] = None,
):
    where_sql, params = _build_where(
        user_id, action, method, path_like, success, object_type, object_id,
        request_id, status_min, status_max, date_from, date_to
    )

    # sorting
    allowed = {"ts","user_id","action","object_type","object_id","success","status_code","method","path","request_id","ip"}
    col = sort.lstrip("-")
    direction = "DESC" if sort.startswith("-") else "ASC"
    order_sql = f" ORDER BY {col} {direction}" if col in allowed else " ORDER BY ts DESC"

    # count
    cnt = db.execute(text(f"SELECT COUNT(*) FROM audit_logs{where_sql}"), params).scalar() or 0

    # pagination
    page = max(page, 1)
    page_size = max(min(page_size, 500), 1)
    offset = (page - 1) * page_size

    rows = db.execute(
        text(
            f"""
            SELECT id, ts, user_id, action, object_type, object_id, object_ids,
                   success, status_code, ip, user_agent, method, path, request_id, meta
            FROM audit_logs
            {where_sql}
            {order_sql}
            LIMIT :limit OFFSET :offset
            """
        ),
        {**params, "limit": page_size, "offset": offset},
    ).mappings().all()

    # ---------- ENRICH (user, project, task) ----------
    # skupi ID-jeve potrebne za batch upite
    user_ids = {r["user_id"] for r in rows if r["user_id"] is not None}
    task_ids = {r["object_id"] for r in rows if r["object_type"] == "task" and r["object_id"] is not None}
    project_ids = {r["object_id"] for r in rows if r["object_type"] == "project" and r["object_id"] is not None}

    # iz path-a pokupi i /projects/{id}…
    rx_proj = re.compile(r"^/projects/(\d+)")
    for r in rows:
        m = rx_proj.match(r.get("path") or "")
        if m:
            project_ids.add(int(m.group(1)))

    # batchevi
    users: dict[int, str] = {}
    if user_ids:
        for u in db.query(UserModel.id, UserModel.name, UserModel.email).filter(UserModel.id.in_(user_ids)).all():
            users[u.id] = u.name or u.email or f"User {u.id}"

    projects: dict[int, str] = {}
    if project_ids:
        for p in db.query(ProjectModel.id, ProjectModel.name).filter(ProjectModel.id.in_(project_ids)).all():
            projects[p.id] = p.name

    task_map: dict[int, dict] = {}
    if task_ids:
        q = (
            db.query(
                TaskModel.id.label("id"),
                ProcessStep.activity.label("title"),
                Top.name.label("top"),
                Ebene.name.label("ebene"),
                Stiege.name.label("stiege"),
                Bauteil.name.label("bauteil"),
                TaskModel.project_id.label("project_id"),
            )
            .outerjoin(ProcessStep, TaskModel.process_step_id == ProcessStep.id)
            .outerjoin(Top, TaskModel.top_id == Top.id)
            .outerjoin(Ebene, Top.ebene_id == Ebene.id)
            .outerjoin(Stiege, Ebene.stiege_id == Stiege.id)
            .outerjoin(Bauteil, Stiege.bauteil_id == Bauteil.id)
            .filter(TaskModel.id.in_(task_ids))
        )
        for t in q.all():
            struct = " / ".join([s for s in [t.bauteil, t.stiege, t.ebene, t.top] if s])
            task_map[t.id] = {
                "title": t.title or "",
                "structure": struct,
                "project_id": t.project_id,
                "project_name": projects.get(t.project_id),
            }

    # obogati svaki red
    items = []
    for r in rows:
        d = dict(r)
        uid = d.get("user_id")
        d["user_name"] = users.get(uid)

        # projekt iz object_id (ako je 'project') ili iz path-a
        proj_name = None
        if d.get("object_type") == "project" and d.get("object_id"):
            proj_name = projects.get(d["object_id"])
        else:
            m = rx_proj.match(d.get("path") or "")
            if m:
                proj_name = projects.get(int(m.group(1)))
        d["project_name"] = proj_name

        # task detalji
        if d.get("object_type") == "task" and d.get("object_id"):
            tinfo = task_map.get(d["object_id"])
            if tinfo:
                d["task_title"] = tinfo["title"]
                d["task_structure"] = tinfo["structure"]
                d["project_name"] = d["project_name"] or tinfo["project_name"]

        items.append(d)

    rows = items
    # -----------------------------------------------

    if format == "csv":
        buff = io.StringIO()
        writer = csv.DictWriter(
            buff,
            fieldnames=[
                "id","ts","user_id","user_name","action","object_type","object_id",
                "object_ids","success","status_code","ip","user_agent","method",
                "path","request_id","project_name","task_title","task_structure","meta"
            ]
        )
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
        resp = Response(buff.getvalue(), media_type="text/csv; charset=utf-8")
        resp.headers["Content-Disposition"] = "attachment; filename=audit.csv"
        return resp

    return {
        "items": rows,
        "total": int(cnt),
        "page": page,
        "page_size": page_size,
    }
