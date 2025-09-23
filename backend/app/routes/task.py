
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

today = date.today()

from app.audit import audit_dep, set_audit_objects
router = APIRouter(dependencies=[Depends(audit_dep())])


# We'll create a condition for delayed tasks
  # Condition 1: task is not done (end_ist is null) and end_soll < today
  # Condition 2: task is done but end_ist > end_soll
delayed_condition = or_(
    and_(Task.end_ist.is_(None), Task.end_soll < today),
    Task.end_ist > Task.end_soll
)

status = ['Erledigt', 'In Bearbeitung', 'Offen']

@router.get("/projects/{project_id}/tasks-count", dependencies=[Depends(audit_dep("TASK_COUNT_READ", "task"))])
def tasks_count(project_id: int, db: Session = Depends(get_db)):
    total = db.query(func.count()).select_from(Task).filter(Task.project_id == project_id).scalar() or 0
    return {"total": int(total)}


@router.post("/tasks", response_model=TaskRead)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**data.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/tasks", response_model=List[TaskRead])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()

from fastapi import Response
import time

@router.get("/projects/{project_id}/tasks-timeline", response_model=List[TimelineTask],
            dependencies=[Depends(audit_dep("TASK_TIMELINE_READ", "task"))])
def project_tasks_timeline(
    project_id: int,
    response: Response,
    db: Session = Depends(get_db),
    gewerk: List[str] = Query(None),
    startDate: str = Query(None),
    endDate: str = Query(None),
    status: List[str] = Query(None),
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
    
    if status:
        status_conditions = []
        if "Erledigt" in status:
            status_conditions.append(Task.end_ist.isnot(None))
        if "In Bearbeitung" in status:
            status_conditions.append(and_(Task.start_ist.isnot(None), Task.end_ist.is_(None)))
        if "Offen" in status:
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



@router.post("/projects/{project_id}/sync-tasks", response_model=list[TaskRead],
             dependencies=[Depends(audit_dep("TASK_SYNC", "task"))])
def sync_tasks(project_id: int, request: Request, db: Session = Depends(get_db)):
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    tops = (
        db.query(Top)
        .join(Ebene)
        .join(Stiege)
        .join(Bauteil)
        .filter(Bauteil.project_id == project_id)
        .all()
    )

    created_tasks = []

    for top in tops:
        model = find_process_model(top, db)
        if not model:
            continue

        # Učitaj postojeće taskove za ovaj Top
        existing_tasks = db.query(Task).filter_by(top_id=top.id).all()
        existing_task_map = {task.process_step_id: task for task in existing_tasks}
        existing_task_step_ids = set(existing_task_map.keys())

        current_date = project.start_date

        # Process steps definisani u modelu
        steps = sorted(model.steps, key=lambda s: s.order if s.order is not None else s.id)
        expected_step_ids = set(step.id for step in steps)

        for step in steps:
            task = existing_task_map.get(step.id)

            duration = step.duration_days or 1
            start_soll = current_date
            end_soll = start_soll + timedelta(days=duration - 1)

            if not task:
                # FAZA 1: Kreiraj novi task
                task = Task(
                    top_id=top.id,
                    process_step_id=step.id,
                    start_soll=start_soll,
                    end_soll=end_soll,
                    status="offen",
                    project_id=project_id
                )
                db.add(task)
                db.flush()
                created_tasks.append(task)
            else:
                # FAZA 2: Ažuriraj ako se razlikuje (i nije započet)
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

            # Pomeri datum ako nije parallel
            if not step.parallel:
                current_date = end_soll + timedelta(days=1)

        # FAZA 3: Briši taskove koji više ne postoje u modelu
        for existing_task in existing_tasks:
            if (
                existing_task.process_step_id not in expected_step_ids
                and existing_task.start_ist is None
            ):
                db.delete(existing_task)

    db.commit()
    # audit: kreirani id-jevi
    from app.audit import set_audit_objects
    set_audit_objects(request, [t.id for t in created_tasks])
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

@router.put("/tasks/{task_id}", response_model=TaskRead,
            dependencies=[Depends(audit_dep("TASK_UPDATE", "task"))])
def update_task(task_id: int, request: Request, task_data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for attr, value in task_data.dict(exclude_unset=True).items():
        setattr(task, attr, value)

    db.commit()
    db.refresh(task)
    set_audit_objects(request, None, object_id=task.id)
    return task

@router.delete("/tasks/{task_id}",
               dependencies=[Depends(audit_dep("TASK_DELETE", "task"))])
def delete_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    set_audit_objects(request, None, object_id=task.id)
    return {"ok": True}

@router.get("/subs")
def list_subs(db: Session = Depends(get_db)):
    subs = db.query(User).filter(User.role == "sub").order_by(User.name).all()
    return [{"id": u.id, "name": u.name, "email": u.email} for u in subs]




@router.patch("/projects/{project_id}/tasks/bulk",
              dependencies=[Depends(audit_dep("TASK_BULK_SET_SUB", "task"))])
def bulk_update_tasks(project_id: int, request: Request, body: BulkBody, db: Session = Depends(get_db)):
    q = db.query(Task).filter(Task.project_id == project_id)

    # po ID-jevima
    if body.ids:
        q = q.filter(Task.id.in_(body.ids))

    # ili po filterima (isto kao u /tasks-timeline)
    f = body.filters
    if f:
        if f.gewerk: q = q.join(Task.process_step).join(ProcessStep.gewerk).filter(Gewerk.name.in_(f.gewerk))
        if f.status:
            conds = []
            if "Erledigt" in f.status: conds.append(Task.end_ist.isnot(None))
            if "In Bearbeitung" in f.status: conds.append(and_(Task.start_ist.isnot(None), Task.end_ist.is_(None)))
            if "Offen" in f.status: conds.append(and_(Task.start_ist.is_(None), Task.end_ist.is_(None)))
            if conds: q = q.filter(or_(*conds))
        if f.startDate: q = q.filter(Task.end_soll >= f.startDate)
        if f.endDate: q  = q.filter(Task.start_soll <= f.endDate)
        if f.delayed:
            today = date.today()
            q = q.filter(or_(and_(Task.end_ist.is_(None), Task.end_soll < today), Task.end_ist > Task.end_soll))
        if f.taskName: q = q.join(Task.process_step).filter(ProcessStep.activity.ilike(f"%{f.taskName}%"))
        if f.tops: q = q.join(Task.top).filter(Top.name.in_(f.tops))
        if f.ebenen: q = q.join(Task.top).join(Top.ebene).filter(Ebene.name.in_(f.ebenen))
        if f.stiegen: q = q.join(Task.top).join(Top.ebene).join(Ebene.stiege).filter(Stiege.name.in_(f.stiegen))
        if f.bauteile: q = q.join(Task.top).join(Top.ebene).join(Ebene.stiege).join(Stiege.bauteil).filter(Bauteil.name.in_(f.bauteile))
        if f.activities: q = q.join(Task.process_step).filter(ProcessStep.activity.in_(f.activities))
        if f.processModels: q = q.join(Task.process_step).join(ProcessStep.model).filter(ProcessModel.name.in_(f.processModels))

    # SET sub_id (ako je poslat)
        if body.update.sub_id is not None:
            ids = [row[0] for row in q.with_entities(Task.id).distinct().all()]
            if not ids:
                set_audit_objects(request, [])
                return {"affected": 0}

            db.query(Task).filter(Task.id.in_(ids)).update(
                {"sub_id": body.update.sub_id},
                synchronize_session=False
            )
            db.commit()

            # audit – zapiši koje taskove si dirao
            set_audit_objects(request, ids)
            return {"affected": len(ids)}

        return {"affected": 0}


