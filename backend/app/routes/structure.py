from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.routes.auth import get_db
from app.schemas.structure import *
from app.crud import structure as crud

router = APIRouter()

@router.post("/bauteile")
def add_bauteil(data: BauteilCreate, db: Session = Depends(get_db)):
    return crud.create_bauteil(db, data)

@router.post("/stiegen")
def add_stiege(data: StiegeCreate, db: Session = Depends(get_db)):
    return crud.create_stiege(db, data)

@router.post("/ebenen")
def add_ebene(data: EbeneCreate, db: Session = Depends(get_db)):
    return crud.create_ebene(db, data)

@router.post("/tops")
def add_top(data: TopCreate, db: Session = Depends(get_db)):
    return crud.create_top(db, data)

@router.get("/projects/{project_id}/structure")
def get_project_structure(
    project_id: int,
    db: Session = Depends(get_db)
):
    return crud.get_project_structure(db, project_id)

@router.post("/projects/{project_id}/bauteil")
def add_bauteil_to_project(
    project_id: int,
    data: BauteilCreate,
    db: Session = Depends(get_db),
):
    return crud.create_bauteil_for_project(db, project_id, data)
