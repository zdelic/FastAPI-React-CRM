from sqlalchemy.orm import Session
from app.models.structure import Bauteil, Stiege, Ebene, Top
from app.schemas.structure import BauteilCreate, StiegeCreate, EbeneCreate, TopCreate

def create_bauteil(db: Session, data: BauteilCreate):
    obj = Bauteil(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def create_stiege(db: Session, data: StiegeCreate):
    obj = Stiege(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def create_ebene(db: Session, data: EbeneCreate):
    obj = Ebene(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def create_top(db: Session, data: TopCreate):
    obj = Top(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def get_project_structure(db: Session, project_id: int):
    return db.query(Bauteil).filter(Bauteil.project_id == project_id).all()

def create_bauteil_for_project(db: Session, project_id: int, data: BauteilCreate):
    bauteil = Bauteil(name=data.name, project_id=project_id)
    db.add(bauteil)
    db.commit()
    db.refresh(bauteil)
    return bauteil