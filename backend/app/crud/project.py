from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate
from app.models.structure import Bauteil

def create_project(db: Session, project: ProjectCreate, user: User):
    db_user = db.merge(user)
    db_project = Project(**project.dict())
    db_project.users.append(db_user)

    # Automatski dodaj Bauteil
    default_bauteil = Bauteil(name="BT-1")
    db_project.bauteile = [default_bauteil]

    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_user_projects(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    return user.projects


def add_user_to_project(db: Session, project_id: int, email: str):
    project = db.query(Project).filter(Project.id == project_id).first()
    user = db.query(User).filter(User.email == email).first()

    if not project or not user:
        return None

    if user not in project.users:
        project.users.append(user)
        db.commit()

    return project