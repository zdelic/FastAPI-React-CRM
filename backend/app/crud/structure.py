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

def get_full_structure(db: Session, project_id: int):
    bauteile = db.query(Bauteil).filter(Bauteil.project_id == project_id).all()
    result = []

    for b in bauteile:
        b_data = {
            "id": b.id,
            "name": b.name,
            "project_id": b.project_id,
            "stiegen": []
        }

        stiegen = db.query(Stiege).filter(Stiege.bauteil_id == b.id).all()
        for s in stiegen:
            s_data = {
                "id": s.id,
                "name": s.name,
                "bauteil_id": s.bauteil_id,
                "ebenen": []
            }

            ebenen = db.query(Ebene).filter(Ebene.stiege_id == s.id).all()
            for e in ebenen:
                e_data = {
                    "id": e.id,
                    "name": e.name,
                    "stiege_id": e.stiege_id,
                    "tops": []
                }

                tops = db.query(Top).filter(Top.ebene_id == e.id).all()
                for t in tops:
                    t_data = {
                        "id": t.id,
                        "name": t.name,
                        "ebene_id": t.ebene_id
                    }
                    e_data["tops"].append(t_data)

                s_data["ebenen"].append(e_data)
            b_data["stiegen"].append(s_data)

        result.append(b_data)
    return result
