from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.gewerk import Gewerk
from pydantic import BaseModel
from typing import List

from app.audit import audit_dep
router = APIRouter(dependencies=[Depends(audit_dep())])


class GewerkCreate(BaseModel):
    name: str
    color: str

class GewerkRead(GewerkCreate):
    id: int

    class Config:
        from_attributes = True  # Pydantic v2

@router.post("/gewerke", response_model=GewerkRead)
def create_gewerk(data: GewerkCreate, db: Session = Depends(get_db)):
    gewerk = Gewerk(**data.dict())
    db.add(gewerk)
    db.commit()
    db.refresh(gewerk)
    return gewerk

@router.get("/gewerke", response_model=List[GewerkRead])
def list_gewerke(db: Session = Depends(get_db)):
    return db.query(Gewerk).all()
