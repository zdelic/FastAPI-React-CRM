
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import timedelta, date
from app.database import get_db
from app.models.structure import Top, Ebene, Stiege, Bauteil
from app.models.process import ProcessModel, ProcessStep
from app.audit import audit_dep, set_audit_objects
from app.models.task import Task
from app.schemas.task import TaskRead
from app.models.project import Project


from app.audit import audit_dep
router = APIRouter(dependencies=[Depends(audit_dep())])


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

@router.post("/projects/{project_id}/generate-tasks", response_model=list[TaskRead],
              dependencies=[Depends(audit_dep("TASK_GENERATE", "task"))])
def generate_tasks(project_id: int, request: Request, db: Session = Depends(get_db)):
    tops = db.query(Top).join(Ebene).join(Stiege).join(Bauteil).filter(Bauteil.project_id == project_id).all()
    if not tops:
        raise HTTPException(status_code=404, detail="No TOPs found in project.")

    created_tasks = []
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    for top in tops:
        model = find_process_model(top, db)
        if not model:
            continue  # skip if no model found for this top

        steps = sorted(model.steps, key=lambda s: s.order if s.order is not None else s.id)

        current_date = project.start_date or date.today()

        for step in steps:
            duration = step.duration_days or 1
            start_soll = current_date
            end_soll = start_soll + timedelta(days=duration - 1)

            task = Task(
                top_id=top.id,
                process_step_id=step.id,
                start_soll=start_soll,
                end_soll=end_soll,
                project_id=project.id, 
                status="offen"
            )
            db.add(task)
            db.flush()
            created_tasks.append(task)

            # Ako nije parallel, pomeri datum za sledeći task
            if not step.parallel:
                current_date = end_soll + timedelta(days=1)

    db.commit()
    set_audit_objects(request, [t.id for t in created_tasks])
    return created_tasks
