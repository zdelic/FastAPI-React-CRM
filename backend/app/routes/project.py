# app/routes/project.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.routes.auth import get_current_user
from app.deps import require_admin
from app.database import get_db
from app.crud import project as crud_project

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

router = APIRouter(prefix="/projects", tags=["projects"])



# --- Projekti ---------------------------------------------------------------

@router.post("", response_model=ProjectRead, dependencies=[Depends(require_admin)])
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    return crud_project.create_project(db, project, current_user)

@router.get("", response_model=List[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    # vrati projekte za ulogovanog korisnika
    return crud_project.get_user_projects(db, current_user.id)

@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(ProjectModel, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
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

@router.get("/{project_id}/users", response_model=List[UserRead])
def list_project_users(project_id: int, db: Session = Depends(get_db)):
    project = db.get(ProjectModel, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.users

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

@router.delete("/{project_id}/users/{user_id}", dependencies=[Depends(require_admin)], status_code=204)
def remove_user_from_project(project_id: int, user_id: int, db: Session = Depends(get_db)):
    project = db.get(ProjectModel, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.users = [u for u in project.users if u.id != user_id]
    db.commit()
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
