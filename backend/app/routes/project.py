from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.project import ProjectCreate, Project
from app.crud import project as crud_project
from app.routes.auth import get_current_user, get_db
from app.schemas.user import User
from app.schemas.project import UserAssign

router = APIRouter()

@router.post("/projects", response_model=Project)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_project.create_project(db, project, current_user)


@router.get("/projects", response_model=list[Project])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_project.get_user_projects(db, current_user.id)


@router.post("/projects/{project_id}/add-user")
def add_user_to_project(
    project_id: int,
    data: UserAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # (Opcionalno) dozvoli samo adminima
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Zabranjeno")

    result = crud_project.add_user_to_project(db, project_id, data.email)
    if not result:
        raise HTTPException(status_code=404, detail="Projekt ili korisnik nije pronađen")
    return {"message": f"Korisnik {data.email} dodat u projekat."}