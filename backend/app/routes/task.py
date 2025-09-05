
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.task import Task
from app.models.structure import Top, Ebene, Stiege, Bauteil
from app.models.process import ProcessStep, ProcessModel
from app.models.gewerk import Gewerk
from app.models.project import Project
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate, TimelineTask
from typing import List
from datetime import date, timedelta
from sqlalchemy import func, select


router = APIRouter()

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

@router.get("/projects/{project_id}/tasks-timeline", response_model=List[TimelineTask])
def project_tasks_timeline(project_id: int, db: Session = Depends(get_db)):
    tasks = (
        db.query(Task)
        .join(Top)
        .join(Ebene, Top.ebene_id == Ebene.id)
        .join(Stiege, Ebene.stiege_id == Stiege.id)
        .join(Bauteil, Stiege.bauteil_id == Bauteil.id)
        .join(ProcessStep, Task.process_step_id == ProcessStep.id)
        .join(ProcessModel, ProcessStep.model_id == ProcessModel.id)
        .filter(Bauteil.project_id == project_id)
        .all()
    )


    result = []
    for t in tasks:
        wohnung = t.top.name or f"Top-{t.top.id}"
        step = t.process_step
        gewerk = db.query(Gewerk).filter_by(id=step.gewerk_id).first()
        farbe = gewerk.color if gewerk else "#cccccc"
        ebene = t.top.ebene
        stiege = ebene.stiege if ebene else None
        bauteil = stiege.bauteil if stiege else None
        step = t.process_step
        model = step.model if step else None


        result.append(TimelineTask(
            id=t.id,
            task=step.activity,
            wohnung=wohnung,
            start_soll=t.start_soll,
            end_soll=t.end_soll,
            start_ist=t.start_ist,
            end_ist=t.end_ist,
            farbe=farbe,
            gewerk_name=gewerk.name if gewerk else "Unbekannt",
            top=t.top.name if t.top else None,
            ebene=ebene.name if ebene else None,
            stiege=stiege.name if stiege else None,
            bauteil=bauteil.name if bauteil else None,
            process_step_id=step.id if step else None,
            process_model=(model.name if model else None),
            beschreibung=t.beschreibung,
        ))
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
def sync_tasks(project_id: int, db: Session = Depends(get_db)):
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
def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for attr, value in task_data.dict(exclude_unset=True).items():
        setattr(task, attr, value)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}

