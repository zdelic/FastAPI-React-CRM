from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.aktivitaet import Aktivitaet
from app.schemas.aktivitaet import AktivitaetCreate, AktivitaetRead
from app.core.protocol import log_protocol
router = APIRouter()



@router.post("/aktivitaeten", response_model=AktivitaetRead, status_code=201)
def create_aktivitaet(data: AktivitaetCreate, request: Request, db: Session = Depends(get_db)):
    aktiv = Aktivitaet(**data.dict())
    db.add(aktiv)
    db.commit()
    db.refresh(aktiv)
    log_protocol(db, request, action="aktivitaet.create", ok=True, status_code=201,
                  details={"id": aktiv.id, "name": aktiv.name, "gewerk_id": aktiv.gewerk_id})
    return aktiv

@router.get("/aktivitaeten", response_model=List[AktivitaetRead])
def list_aktivitaeten(db: Session = Depends(get_db)):
    return db.query(Aktivitaet).all()

@router.get("/gewerke/{gewerk_id}/aktivitaeten", response_model=List[AktivitaetRead])
def get_by_gewerk(gewerk_id: int, db: Session = Depends(get_db)):
    return db.query(Aktivitaet).filter_by(gewerk_id=gewerk_id).all()
