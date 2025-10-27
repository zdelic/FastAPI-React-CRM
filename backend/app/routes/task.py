
from fastapi import Request
from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.orm import Session, joinedload, load_only
from app.database import get_db
from app.models.task import Task
from app.models.structure import Top, Ebene, Stiege, Bauteil
from app.models.process import ProcessStep, ProcessModel
from app.models.gewerk import Gewerk
from app.models.project import Project
from app.models.user import User 
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate, TimelineTask
from app.schemas.bulk import BulkBody, BulkFilters, BulkUpdate
from typing import List
from datetime import date, timedelta, datetime
from sqlalchemy import func, select, or_, and_, case, cast, Integer
from app.core.protocol import compute_diff, log_protocol
from pydantic import BaseModel
from typing import Optional


today = date.today()
router = APIRouter()

def _to_date(v):
    if v is None: return None
    if isinstance(v, date) and not isinstance(v, datetime): return v
    if isinstance(v, datetime): return v.date()
    if isinstance(v, str):
        s = v[:10]
        try: return date.fromisoformat(s)
        except Exception: return None
    return None

def is_weekend(d: date) -> bool:
    return d.weekday() >= 5  # 5=Sub, 6=Ned

def next_workday(d: date) -> date:
    while is_weekend(d):
        d += timedelta(days=1)
    return d

def add_workdays(start: date, days: int) -> date:
    """Vrati zadnji radni dan intervala dužine 'days'.
       start se računa kao 1. radni dan (inkluzivan)."""
    d = next_workday(start)
    remaining = max(1, days) - 1
    while remaining > 0:
        d += timedelta(days=1)
        if not is_weekend(d):
            remaining -= 1
    return d


# We'll create a condition for delayed tasks
  # Condition 1: task is not done (end_ist is null) and end_soll < today
  # Condition 2: task is done but end_ist > end_soll
delayed_condition = or_(
    and_(Task.end_ist.is_(None), Task.end_soll < today),
    Task.end_ist > Task.end_soll
)

STATUS_CHOICES = ("Erledigt", "In Bearbeitung", "Offen")

@router.get("/projects/{project_id}/tasks-count")
def tasks_count(project_id: int, db: Session = Depends(get_db)):
    total = db.query(func.count()).select_from(Task).filter(Task.project_id == project_id).scalar() or 0
    return {"total": int(total)}


@router.post("/tasks", response_model=TaskRead, status_code=201)
def create_task(data: TaskCreate, request: Request, db: Session = Depends(get_db)):
    task = Task(**data.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    log_protocol(db, request, action="task.create", ok=True, status_code=201,
                 details={"task_id": task.id, "payload": data.dict()})
    return task

@router.get("/tasks", response_model=List[TaskRead])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()

from fastapi import Response
import time

@router.get("/projects/{project_id}/tasks-timeline", response_model=List[TimelineTask])
def project_tasks_timeline(
    project_id: int,
    response: Response,
    db: Session = Depends(get_db),
    gewerk: List[str] = Query(None),
    startDate: str = Query(None),
    endDate: str = Query(None),
    statuses: List[str] = Query(None, alias="status"),
    delayed: bool = Query(None),
    taskName: str = Query(None),
    top: List[str] = Query(None),
    ebene: List[str] = Query(None),
    stiege: List[str] = Query(None),
    bauteil: List[str] = Query(None),
    activity: List[str] = Query(None),
    processModel: List[str] = Query(None)
):
    t0 = time.perf_counter()

    # Osnovni query s joinovima
    q = (
        db.query(Task)
        .filter(Task.project_id == project_id)
        .options(
            joinedload(Task.top)
                .joinedload(Top.ebene)
                .joinedload(Ebene.stiege)
                .joinedload(Stiege.bauteil),
            joinedload(Task.process_step).joinedload(ProcessStep.gewerk),
            joinedload(Task.process_step).joinedload(ProcessStep.model),
            joinedload(Task.sub),
            load_only(
                Task.id, Task.project_id, Task.top_id, Task.process_step_id,
                Task.start_soll, Task.end_soll, Task.start_ist, Task.end_ist,
                Task.beschreibung, Task.sub_id
            ),
        )
    )

    # Primjeni filtere
    if gewerk:
        q = q.join(Task.process_step).join(ProcessStep.gewerk).filter(Gewerk.name.in_(gewerk))
    
    if startDate:
        start_date = datetime.strptime(startDate, "%Y-%m-%d").date()
        q = q.filter(Task.end_soll >= start_date)
    
    if endDate:
        end_date = datetime.strptime(endDate, "%Y-%m-%d").date()
        q = q.filter(Task.start_soll <= end_date)
    
    if statuses:
        status_conditions = []
        if "Erledigt" in statuses:
            status_conditions.append(Task.end_ist.isnot(None))
        if "In Bearbeitung" in statuses:
            status_conditions.append(and_(Task.start_ist.isnot(None), Task.end_ist.is_(None)))
        if "Offen" in statuses:
            status_conditions.append(and_(Task.start_ist.is_(None), Task.end_ist.is_(None)))

        if status_conditions:
            q = q.filter(or_(*status_conditions))
    
    if delayed:
        today = date.today()
        q = q.filter(
            or_(
                and_(Task.end_ist.is_(None), Task.end_soll < today),
                Task.end_ist > Task.end_soll
            )
        )
    
    if taskName:
        q = q.join(Task.process_step).filter(ProcessStep.activity.ilike(f"%{taskName}%"))
    
    if top:
        q = q.join(Task.top).filter(Top.name.in_(top))
    
    if ebene:
        q = q.join(Task.top).join(Top.ebene).filter(Ebene.name.in_(ebene))
    
    if stiege:
        q = q.join(Task.top).join(Top.ebene).join(Ebene.stiege).filter(Stiege.name.in_(stiege))
    
    if bauteil:
        q = q.join(Task.top).join(Top.ebene).join(Ebene.stiege).join(Stiege.bauteil).filter(Bauteil.name.in_(bauteil))
    
    if activity:
        q = q.join(Task.process_step).filter(ProcessStep.activity.in_(activity))
    
    if processModel:
        q = q.join(Task.process_step).join(ProcessStep.model).filter(ProcessModel.name.in_(processModel))

    q = q.execution_options(stream_results=True)

    # Ostali dio funkcije ostaje isti
    t_fetch_start = time.perf_counter()
    tasks = q.all()
    t_fetch_ms = (time.perf_counter() - t_fetch_start) * 1000.0

    t_build_start = time.perf_counter()
    result: list[TimelineTask] = []
    for t in tasks:
        top = t.top
        ebene = top.ebene if top else None
        stiege = ebene.stiege if ebene else None
        bauteil = stiege.bauteil if stiege else None

        step = t.process_step
        model = step.model if step else None
        gewerk_obj = step.gewerk if step else None

        wohnung = (top.name if (top and top.name) else (f"Top-{top.id}" if top else None))
        farbe = getattr(gewerk_obj, "color", "#cccccc")
        gewerk_name = getattr(gewerk_obj, "name", "Unbekannt")
        sub_user = t.sub if t.sub_id else None

        result.append(TimelineTask(
            id=t.id,
            task=step.activity if step else None,
            wohnung=wohnung,
            start_soll=t.start_soll,
            end_soll=t.end_soll,
            start_ist=t.start_ist,
            end_ist=t.end_ist,
            farbe=farbe,
            gewerk_name=gewerk_name,
            top=top.name if top else None,
            ebene=ebene.name if ebene else None,
            stiege=stiege.name if stiege else None,
            bauteil=bauteil.name if bauteil else None,
            process_step_id=step.id if step else None,
            process_model=(model.name if model else None),
            beschreibung=t.beschreibung,
            sub_id=sub_user.id if sub_user else None,
            sub_name=sub_user.name if sub_user else None,
            top_id=t.top_id,
            project_id=t.project_id,
        ))
    t_build_ms = (time.perf_counter() - t_build_start) * 1000.0

    response.headers["X-Items"] = str(len(result))
    response.headers["X-FetchMs"] = f"{t_fetch_ms:.1f}"
    response.headers["X-BuildMs"] = f"{t_build_ms:.1f}"

    return result


@router.get("/projects/{project_id}/has-tasks", response_model=bool)
def has_tasks(project_id: int, db: Session = Depends(get_db)):
    count = db.query(Task).filter(Task.project_id == project_id).count()
    return count > 0


def find_process_model(top: Top, db: Session):
    if top.process_model_id:
        return db.query(ProcessModel).filter_by(id=top.process_model_id).first()
    ebene = db.query(Ebene).filter_by(id=top.ebene_id).first()
    if ebene and ebene.process_model_id:
        return db.query(ProcessModel).filter_by(id=ebene.process_model_id).first()
    stiege = db.query(Stiege).filter_by(id=ebene.stiege_id).first() if ebene else None
    if stiege and stiege.process_model_id:
        return db.query(ProcessModel).filter_by(id=stiege.process_model_id).first()
    bauteil = db.query(Bauteil).filter_by(id=stiege.bauteil_id).first() if stiege else None
    if bauteil and bauteil.process_model_id:
        return db.query(ProcessModel).filter_by(id=bauteil.process_model_id).first()
    return None



@router.post("/projects/{project_id}/sync-tasks", response_model=list[TaskRead])
async def sync_tasks(project_id: int, request: Request, db: Session = Depends(get_db)):
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    # 1) pročitaj mapu datuma iz bodyja
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    start_map = (payload or {}).get("start_map") or {}
    start_map_top: dict[str, str] = (start_map or {}).get("top") or {}

    # 2) svi topovi u projektu
    tops = (
        db.query(Top)
        .join(Ebene)
        .join(Stiege)
        .join(Bauteil)
        .filter(Bauteil.project_id == project_id)
        .all()
    )

    created_tasks: list[Task] = []

    for top in tops:
        model = find_process_model(top, db)
        if not model:
            continue

        # postojeći taskovi za ovaj top
        existing_tasks = db.query(Task).filter_by(top_id=top.id).all()
        existing_task_map = {t.process_step_id: t for t in existing_tasks}

        # 3) bazni datum: iz mape → project.start_date → today
        base_str = start_map_top.get(str(top.id))
        base_date = None
        if base_str:
            try: base_date = date.fromisoformat(base_str[:10])
            except Exception: base_date = None
        if base_date is None:
            base_date = project.start_date or date.today()
        current_date = next_workday(base_date)  # ⬅️


        # 4) koraci po redu
        steps = sorted(
            model.steps,
            key=lambda s: (s.order if s.order is not None else s.id)
        )
        expected_step_ids = {s.id for s in steps}

        for step in steps:
            task = existing_task_map.get(step.id)

            duration   = step.duration_days or 1
            start_soll = next_workday(current_date)         # ⬅️
            end_soll   = add_workdays(start_soll, duration) # ⬅️


            if not task:
                # kreiraj novi
                task = Task(
                    top_id=top.id,
                    process_step_id=step.id,
                    start_soll=start_soll,
                    end_soll=end_soll,
                    status="offen",
                    project_id=project_id,
                )
                db.add(task)
                db.flush()
                created_tasks.append(task)
            else:
                # ažuriraj datume samo ako task nije započet
                if task.start_ist is None:
                    changed = False
                    if task.start_soll != start_soll:
                        task.start_soll = start_soll
                        changed = True
                    if task.end_soll != end_soll:
                        task.end_soll = end_soll
                        changed = True
                    if changed:
                        db.add(task)

            # pomjeri samo ako nije paralelan
            if not getattr(step, "parallel", False):
                current_date = next_workday(end_soll + timedelta(days=1))  # ⬅️


        # 5) ukloni taskove koji više nisu u modelu (ako nisu započeti)
        for old in existing_tasks:
            if old.process_step_id not in expected_step_ids and old.start_ist is None:
                db.delete(old)

    db.commit()
    log_protocol(
        db, request,
        action="task.sync", ok=True, status_code=200,
        details={"project_id": project_id, "created": [t.id for t in created_tasks]},
    )
    return created_tasks



@router.get("/projects/{project_id}/task-stats")
def project_task_stats(project_id: int, db: Session = Depends(get_db)):
    # Učitaj sve taskove po projektu direktno
    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    # Ukupan broj taskova
    total = len(tasks)
    done = sum(1 for t in tasks if t.status == "done")
    in_progress = sum(1 for t in tasks if t.status == "in_progress")
    offen = sum(1 for t in tasks if t.status == "offen")
    percent_done = round((done / total) * 100, 1) if total else 0

    # Grupisanje po gewerk (ako postoji)
    gewerk_stats = {}
    for task in tasks:
        if not task.process_step or not task.process_step.gewerk:
            continue  # preskoči ako fali veza

        name = task.process_step.gewerk.name

        if name not in gewerk_stats:
            gewerk_stats[name] = {"done": 0, "in_progress": 0, "offen": 0}

        if task.status in gewerk_stats[name]:
            gewerk_stats[name][task.status] += 1

    return {
        "total": total,
        "done": done,
        "in_progress": in_progress,
        "offen": offen,
        "percent_done": percent_done,
        "by_gewerk": [
            {"gewerk": name, **counts} for name, counts in gewerk_stats.items()
        ]
    }



@router.get("/projects/{project_id}/progress-curve")
def get_progress_curve(project_id: int, db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    data = {}

    for task in tasks:
        # Soll = planirano
        soll = task.start_soll or task.end_soll
        if soll:
            week = soll.isocalendar()[1]
            year = soll.isocalendar()[0]
            key = f"{year}-KW{week}"
            data.setdefault(key, {"soll": 0, "ist": 0})
            data[key]["soll"] += 1

        # Ist = stvarno završeno
        ist = task.end_ist or task.start_ist
        if ist:
            week = ist.isocalendar()[1]
            year = ist.isocalendar()[0]
            key = f"{year}-KW{week}"
            data.setdefault(key, {"soll": 0, "ist": 0})
            data[key]["ist"] += 1

    sorted_keys = sorted(data.keys())

    return {
        "labels": sorted_keys,
        "soll": [data[k]["soll"] for k in sorted_keys],
        "ist": [data[k]["ist"] for k in sorted_keys],
    }

@router.put("/tasks/{task_id}", response_model=TaskRead)
def update_task(task_id: int, request: Request, task_data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    updates = task_data.dict(exclude_unset=True)  # samo poslana polja
    diff = compute_diff(task, updates)

    if not task:
        raise HTTPException(status_code=404, detail="Task nicht gefunden")

    for attr, value in task_data.dict(exclude_unset=True).items():
        setattr(task, attr, value)

    db.commit()
    log_protocol(
        db, request,
        action="task.update", ok=True, status_code=200,
        details={
            "task_id": task.id,
            "changes": diff,
        },
    )
    db.refresh(task)
    
    return task

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task nicht gefunden")
    db.delete(task)
    db.commit()
    log_protocol(db, request, action="task.delete", ok=True, status_code=200,
                 details={"task_id": task.id})
    
    return {"ok": True}

@router.get("/subs")
def list_subs(db: Session = Depends(get_db)):
    subs = db.query(User).filter(User.role == "sub").order_by(User.name).all()
    return [{"id": u.id, "name": u.name, "email": u.email} for u in subs]




@router.patch("/projects/{project_id}/tasks/bulk")
def bulk_update_tasks(project_id: int, request: Request, body: BulkBody, db: Session = Depends(get_db)):
    # Bazni query za sve taskove u projektu
    q = db.query(Task).filter(Task.project_id == project_id)

    # Po ID-jevima
    if body.ids:
        q = q.filter(Task.id.in_(body.ids))

    # Po filterima (isto kao u /tasks-timeline)
    f = body.filters
    if f:
        if f.gewerk:
            q = q.join(Task.process_step).join(ProcessStep.gewerk).filter(Gewerk.name.in_(f.gewerk))
        if f.status:
            conds = []
            if "Erledigt" in f.status:
                conds.append(Task.end_ist.isnot(None))
            if "In Bearbeitung" in f.status:
                conds.append(and_(Task.start_ist.isnot(None), Task.end_ist.is_(None)))
            if "Offen" in f.status:
                conds.append(and_(Task.start_ist.is_(None), Task.end_ist.is_(None)))
            if conds:
                q = q.filter(or_(*conds))
        if f.startDate:
            q = q.filter(Task.end_soll >= f.startDate)
        if f.endDate:
            q = q.filter(Task.start_soll <= f.endDate)
        if f.delayed:
            today = date.today()
            q = q.filter(or_(
                and_(Task.end_ist.is_(None), Task.end_soll < today),
                Task.end_ist > Task.end_soll
            ))
        if f.taskName:
            q = q.join(Task.process_step).filter(ProcessStep.activity.ilike(f"%{f.taskName}%"))
        if f.tops:
            q = q.join(Task.top).filter(Top.name.in_(f.tops))
        if f.ebenen:
            q = q.join(Task.top).join(Top.ebene).filter(Ebene.name.in_(f.ebenen))
        if f.stiegen:
            q = q.join(Task.top).join(Top.ebene).join(Ebene.stiege).filter(Stiege.name.in_(f.stiegen))
        if f.bauteile:
            q = q.join(Task.top).join(Top.ebene).join(Ebene.stiege).join(Stiege.bauteil).filter(Bauteil.name.in_(f.bauteile))
        if f.activities:
            q = q.join(Task.process_step).filter(ProcessStep.activity.in_(f.activities))
        if f.processModels:
            q = q.join(Task.process_step).join(ProcessStep.model).filter(ProcessModel.name.in_(f.processModels))

    # SET sub_id (ako je poslat)
    if body.update and body.update.sub_id is not None:
        # 1) validiraj "sub" kao User sa ulogom sub
        sub_user = db.query(User).get(body.update.sub_id)
        if not sub_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subunternehmen (User) nicht gefunden")
        if (getattr(sub_user, "role", None) or "").lower() != "sub":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Angegebener Benutzer ist kein Subunternehmen")

        # 2) uzmi ID-jeve pogođenih taskova
        ids = [row[0] for row in q.with_entities(Task.id).distinct().all()]
        if not ids:
            return {"betroffen": 0}

        # 3) update svih odabranih taskova
        db.query(Task).filter(Task.id.in_(ids)).update(
            {"sub_id": body.update.sub_id},
            synchronize_session=False
        )
        db.commit()

        # 4) pripremi listu taskova za log (limit da payload ne eksplodira)
        N = 100
        tasks_for_log = (
            db.query(Task)
            .options(
                joinedload(Task.process_step),
                joinedload(Task.top).joinedload(Top.ebene).joinedload(Ebene.stiege).joinedload(Stiege.bauteil),
            )
            .filter(Task.id.in_(ids))
            .limit(N)
            .all()
        )

        def _task_label(t: Task):
            name = getattr(getattr(t, "process_step", None), "activity", None) or getattr(t, "name", None) or ""
            parts = []
            top = getattr(t, "top", None)
            if top:
                ebene = getattr(top, "ebene", None)
                stiege = getattr(ebene, "stiege", None) if ebene else None
                bauteil = getattr(stiege, "bauteil", None) if stiege else None
                parts = [
                    getattr(bauteil, "name", None),
                    getattr(stiege, "name", None),
                    getattr(ebene, "name", None),
                    getattr(top, "name", None),
                ]
            loc = " • ".join([p for p in parts if p])
            return {"id": t.id, "name": name, "location": loc}

        tasks_list = [_task_label(t) for t in tasks_for_log]

        # 5) dohvat imena projekta (za kolonu "Projekt" i details)
        proj = db.query(Project).get(project_id)
        proj_name = getattr(proj, "name", None) if proj else None

        # 6) log sa projektom, sub imenom i listom taskova
        log_protocol(
            db, request,
            action="task.bulk.assign_sub", ok=True, status_code=200,
            details={
                "project_id": project_id,
                "project_name": proj_name,
                "sub_id": body.update.sub_id,
                "sub_name": getattr(sub_user, "name", None) or getattr(sub_user, "email", None),
                "affected": len(ids),
                "tasks": tasks_list,  # [{id, name, location}, ...]
                "filters": body.filters.model_dump() if body.filters else None,
            },
        )

        return {"betroffen": len(ids)}

    # Ako se ništa ne ažurira (trenutno podržavamo samo sub_id), vrati 0
    return {"betroffen": 0}


# ===== Zeitsprung / skip-window ============================================

class SkipWindowFilters(BaseModel):
    top: Optional[list[str]] = None
    ebene: Optional[list[str]] = None
    stiege: Optional[list[str]] = None
    bauteil: Optional[list[str]] = None
    gewerk: Optional[list[str]] = None
    activity: Optional[list[str]] = None
    processModel: Optional[list[str]] = None

class SkipWindowRequest(BaseModel):
    start: date
    end: date
    skip_weekends: bool = True
    filters: Optional[SkipWindowFilters] = None

def _ranges_overlap(a_start: date | None, a_end: date | None,
                    b_start: date, b_end: date) -> bool:
    if a_start is None or a_end is None:
        return False
    return a_start <= b_end and b_start <= a_end

def _count_weekend_days(start: date, end: date) -> int:
    if end < start:
        return 0
    days = (end - start).days + 1
    wend = 0
    for i in range(days):
        d = start + timedelta(days=i)
        if d.weekday() >= 5:  # 5=Sat, 6=Sun
            wend += 1
    return wend

@router.post("/projects/{project_id}/schedule/skip-window")
def schedule_skip_window(
    project_id: int,
    payload: SkipWindowRequest,
    db: Session = Depends(get_db),
):
    # 0) validacije
    if payload.end < payload.start:
        raise HTTPException(status_code=400, detail="Ende vor Start")

    # 1) koliko dana skačemo
    shift_days = (payload.end - payload.start).days + 1
    if payload.skip_weekends:
        shift_days -= _count_weekend_days(payload.start, payload.end)
        if shift_days < 0:
            shift_days = 0
    if shift_days == 0:
        return {"moved": 0, "days_shifted": 0}

    # 2) bazni query svih taskova projekta
    q = db.query(Task).filter(Task.project_id == project_id)

    # 3) (opcionalni) filteri – uključi samo ako koristiš te kolone
    f = payload.filters
    if f:
        if f.top:
            q = q.join(Task.top).filter(Top.name.in_(f.top))
        if f.ebene:
            q = q.join(Task.top).join(Top.ebene).filter(Ebene.name.in_(f.ebene))
        if f.stiege:
            q = q.join(Task.top).join(Top.ebene).join(Ebene.stiege).filter(Stiege.name.in_(f.stiege))
        if f.bauteil:
            q = q.join(Task.top).join(Top.ebene).join(Ebene.stiege).join(Stiege.bauteil).filter(Bauteil.name.in_(f.bauteil))
        if f.gewerk:
            q = q.join(Task.process_step).join(ProcessStep.gewerk).filter(Gewerk.name.in_(f.gewerk))
        if f.activity:
            q = q.join(Task.process_step).filter(ProcessStep.activity.in_(f.activity))
        if f.processModel:
            q = q.join(Task.process_step).join(ProcessStep.model).filter(ProcessModel.name.in_(f.processModel))

    moved = 0
    for t in q.all():
        s = t.start_soll
        e = t.end_soll
        if _ranges_overlap(s, e, payload.start, payload.end):
            if s is not None:
                t.start_soll = s + timedelta(days=shift_days)
            if e is not None:
                t.end_soll = e + timedelta(days=shift_days)
            moved += 1

    db.commit()
    return {"moved": moved, "days_shifted": shift_days}
