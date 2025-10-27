from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.gewerk import Gewerk
from pydantic import BaseModel
from typing import List
from app.core.protocol import log_protocol

router = APIRouter()

class GewerkCreate(BaseModel):
    name: str
    color: str

class GewerkRead(GewerkCreate):
    id: int

    class Config:
        from_attributes = True  # Pydantic v2

@router.post("/gewerke", response_model=GewerkRead, status_code=201)
def create_gewerk(data: GewerkCreate, request: Request, db: Session = Depends(get_db)):
    gewerk = Gewerk(**data.dict())
    db.add(gewerk)
    db.commit()
    db.refresh(gewerk)
    log_protocol(db, request, action="gewerk.create", ok=True, status_code=201,
                 details={"id": gewerk.id, "name": gewerk.name})
    return gewerk

@router.get("/gewerke", response_model=List[GewerkRead])
def list_gewerke(db: Session = Depends(get_db)):
    return db.query(Gewerk).all()
