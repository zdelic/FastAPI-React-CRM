from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.aktivitaet import Aktivitaet
from app.schemas.aktivitaet import AktivitaetCreate, AktivitaetRead

router = APIRouter()

@router.post("/aktivitaeten", response_model=AktivitaetRead)
def create_aktivitaet(data: AktivitaetCreate, db: Session = Depends(get_db)):
    aktiv = Aktivitaet(**data.dict())
    db.add(aktiv)
    db.commit()
    db.refresh(aktiv)
    return aktiv

@router.get("/aktivitaeten", response_model=List[AktivitaetRead])
def list_aktivitaeten(db: Session = Depends(get_db)):
    return db.query(Aktivitaet).all()

@router.get("/gewerke/{gewerk_id}/aktivitaeten", response_model=List[AktivitaetRead])
def get_by_gewerk(gewerk_id: int, db: Session = Depends(get_db)):
    return db.query(Aktivitaet).filter_by(gewerk_id=gewerk_id).all()
