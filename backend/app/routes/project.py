# app/routes/project.py
from typing import List

from fastapi import Request
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.routes.auth import get_current_user
from app.deps import require_admin
from app.database import get_db
from app.crud import project as crud_project, user
from app.models.task import Task as TaskModel


from app.models.project import Project as ProjectModel
from app.models.user import User as UserModel

from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    Project as ProjectRead,   # Pydantic "read" shema
    UserAssign,
)
from app.schemas.user import UserRead
from app.schemas.project_user import ProjectUserAdd, ProjectUsersReplace


from app.audit import audit_dep, set_audit_objects
router = APIRouter(prefix="/projects", tags=["projects"], dependencies=[Depends(audit_dep())])




# --- Projekti ---------------------------------------------------------------

@router.post(
    "",
    response_model=ProjectRead,
    dependencies=[Depends(require_admin), Depends(audit_dep("PROJECT_CREATE","project"))],
)
def create_project(
    project: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    new_proj = crud_project.create_project(db, project, current_user)
    set_audit_objects(request, None, object_id=new_proj.id)
    return new_proj


@router.get("", response_model=List[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    # SUB: projekti na kojima je član ∪ projekti gdje ima bar jedan task (tasks.sub_id == current_user.id)
    if current_user.role == "sub":
        # projekti iz taskova
        q_tasks = (
            db.query(ProjectModel)
            .join(TaskModel, TaskModel.project_id == ProjectModel.id)
            .filter(TaskModel.sub_id == current_user.id)
        )

        # projekti iz eksplicitnog članstva
        q_membership = (
            db.query(ProjectModel)
            .join(ProjectModel.users)  # many-to-many relacija Project.users
            .filter(UserModel.id == current_user.id)
        )

        projects = q_tasks.union(q_membership).distinct().all()
        return projects

    # ostale uloge: postojeća logika (projekti gdje je korisnik član)
    return crud_project.get_user_projects(db, current_user.id)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    project = db.get(ProjectModel, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    # SUB može otvoriti samo ako je član projekta ili ima bar jedan task u njemu
    if current_user.role == "sub":
        is_member = any(u.id == current_user.id for u in project.users)
        has_tasks = (
            db.query(TaskModel)
            .filter(TaskModel.project_id == project_id, TaskModel.sub_id == current_user.id)
            .first()
            is not None
        )
        if not (is_member or has_tasks):
            raise HTTPException(status_code=403, detail="Kein Zugriff auf dieses Projekt")

    return project


@router.put("/{project_id}", response_model=ProjectRead, dependencies=[Depends(require_admin)])
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.get(ProjectModel, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.start_date is not None:
        db_project.start_date = payload.start_date

    db.commit()
    db.refresh(db_project)
    return db_project

# (opcionalno) dodavanje korisnika po emailu – zahtijeva admina
@router.post("/{project_id}/add-user")
def add_user_to_project_by_email(
    project_id: int,
    data: UserAssign,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Zabranjeno")
    result = crud_project.add_user_to_project(db, project_id, data.email)
    if not result:
        raise HTTPException(status_code=404, detail="Projekt ili korisnik nije pronađen")
    return {"message": f"Korisnik {data.email} dodat u projekat."}

# --- Veze projekat ↔ korisnici ---------------------------------------------

@router.post(
    "/{project_id}/users",
    dependencies=[Depends(require_admin), Depends(audit_dep("PROJECT_ADD_USER","project"))],
    response_model=UserRead,
    status_code=201,
)
def add_user_to_project(
    project_id: int,
    request: Request,
    payload: ProjectUserAdd,
    db: Session = Depends(get_db),
):
    project = db.get(ProjectModel, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user = db.get(UserModel, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if any(u.id == user.id for u in project.users):
        raise HTTPException(status_code=409, detail="User already in project")

    project.users.append(user)
    db.commit()
    db.refresh(project)

    set_audit_objects(request, [user.id], object_id=project_id)
    return user


@router.post("/{project_id}/users", dependencies=[Depends(require_admin)], response_model=UserRead, status_code=201)
def add_user_to_project(project_id: int, payload: ProjectUserAdd, db: Session = Depends(get_db)):
    project = db.get(ProjectModel, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    user = db.get(UserModel, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if any(u.id == user.id for u in project.users):
        raise HTTPException(status_code=409, detail="User already in project")

    project.users.append(user)
    db.commit()
    db.refresh(project)
    return user

@router.delete("/{project_id}/users/{user_id}",
               dependencies=[Depends(require_admin), Depends(audit_dep("PROJECT_REMOVE_USER","project"))], status_code=204)
def remove_user_from_project(project_id: int, request: Request, user_id: int, db: Session = Depends(get_db)):
    project = db.get(ProjectModel, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.users = [u for u in project.users if u.id != user_id]
    db.commit()
    set_audit_objects(request, [user_id], object_id=project_id)
    return

@router.put("/{project_id}/users", dependencies=[Depends(require_admin)], response_model=List[UserRead])
def replace_project_users(project_id: int, payload: ProjectUsersReplace, db: Session = Depends(get_db)):
    project = db.get(ProjectModel, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    users = db.execute(
        select(UserModel).where(UserModel.id.in_(payload.user_ids))
    ).scalars().all()

    project.users = users
    db.commit()
    db.refresh(project)
    return project.users
