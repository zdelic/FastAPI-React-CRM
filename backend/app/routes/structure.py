from fastapi import Request
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.structure import Bauteil, Stiege, Ebene, Top
from app.schemas.structure import BauteilUpdate, StiegeUpdate, EbeneUpdate, TopUpdate, BauteilCreate, StiegeCreate, EbeneCreate, TopCreate
from app.crud import structure as crud
from fastapi.encoders import jsonable_encoder
from app.schemas.structure import Bauteil as BauteilSchema

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

@router.get("/projects/{project_id}/structure", response_model=list[BauteilSchema])
def get_structure(project_id: int, db: Session = Depends(get_db)):
    bauteile = (
        db.query(Bauteil)
        .options(
            joinedload(Bauteil.stiegen)
            .joinedload(Stiege.ebenen)
            .joinedload(Ebene.tops)
        )
        .filter(Bauteil.project_id == project_id)
        .all()
    )

    mapped = [BauteilSchema.model_validate(b).model_dump(mode="json") for b in bauteile]

    
    return mapped

@router.post("/projects/{project_id}/bauteil")
def add_bauteil_to_project(
    project_id: int,
    data: BauteilCreate,
    db: Session = Depends(get_db),
):
    return crud.create_bauteil_for_project(db, project_id, data)

@router.get("/projects/{project_id}/structure/full")
def get_full_project_structure(
    project_id: int,
    db: Session = Depends(get_db)
):
    return crud.get_full_structure(db, project_id)

# UPDATE


@router.put("/bauteile/{bauteil_id}")
def update_bauteil(bauteil_id: int, request: Request, data: BauteilUpdate, db: Session = Depends(get_db), propagate: bool = Query(True)):
    bauteil = (
        db.query(Bauteil)
        .options(
            joinedload(Bauteil.stiegen).joinedload(Stiege.ebenen).joinedload(Ebene.tops)
        )
        .filter(Bauteil.id == bauteil_id)
        .first()
    )
    if not bauteil:
        raise HTTPException(status_code=404, detail="Bauteil not found")

    # obavezno oba polja
    bauteil.name = data.name
    bauteil.process_model_id = data.process_model_id
    db.commit()

    if propagate and data.process_model_id is not None:
        for stiege in bauteil.stiegen:
            stiege.process_model_id = data.process_model_id
            for ebene in stiege.ebenen:
                ebene.process_model_id = data.process_model_id
                for top in ebene.tops:
                    top.process_model_id = data.process_model_id
        db.commit()

    return bauteil



@router.put("/stiegen/{stiege_id}")
def update_stiege(stiege_id: int, data: StiegeUpdate, db: Session = Depends(get_db), propagate: bool = Query(True)):
    stiege = (
        db.query(Stiege)
        .options(joinedload(Stiege.ebenen).joinedload(Ebene.tops))
        .filter(Stiege.id == stiege_id)
        .first()
    )
    if not stiege:
        raise HTTPException(status_code=404, detail="Stiege not found")

    stiege.name = data.name
    stiege.process_model_id = data.process_model_id
    db.commit()

    if propagate and data.process_model_id is not None:
        for ebene in stiege.ebenen:
            ebene.process_model_id = data.process_model_id
            for top in ebene.tops:
                top.process_model_id = data.process_model_id
        db.commit()

    return stiege

@router.put("/ebenen/{ebene_id}")
def update_ebene(ebene_id: int, data: EbeneUpdate, db: Session = Depends(get_db), propagate: bool = Query(True)):
    ebene = (
        db.query(Ebene)
        .options(joinedload(Ebene.tops))
        .filter(Ebene.id == ebene_id)
        .first()
    )
    if not ebene:
        raise HTTPException(status_code=404, detail="Ebene not found")

    ebene.name = data.name
    ebene.process_model_id = data.process_model_id
    db.commit()

    if propagate and data.process_model_id is not None:
        for top in ebene.tops:
            top.process_model_id = data.process_model_id
        db.commit()

    return ebene



@router.put("/tops/{top_id}")
def update_top(top_id: int, data: TopUpdate, db: Session = Depends(get_db)):
    obj = db.query(Top).get(top_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Top not found")
    obj.name = data.name
    obj.process_model_id = data.process_model_id
    db.commit()
    return obj

@router.delete("/bauteile/{bauteil_id}")
def delete_bauteil(bauteil_id: int, db: Session = Depends(get_db)):
    obj = db.query(Bauteil).get(bauteil_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Bauteil not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted"}

@router.delete("/stiegen/{stiege_id}")
def delete_stiege(stiege_id: int, db: Session = Depends(get_db)):
    obj = db.query(Stiege).get(stiege_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Stiege not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted"}

@router.delete("/ebenen/{ebene_id}")
def delete_ebene(ebene_id: int, db: Session = Depends(get_db)):
    obj = db.query(Ebene).get(ebene_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Ebene not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted"}

@router.delete("/tops/{top_id}")
def delete_top(top_id: int, db: Session = Depends(get_db)):
    obj = db.query(Top).get(top_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Top not found")
    db.delete(obj)
    db.commit()
    return {"message": "Deleted"}

@router.get("/tops/{top_id}")
def get_top(top_id: int, db: Session = Depends(get_db)):
    top = db.query(Top).get(top_id)
    if not top:
        raise HTTPException(status_code=404, detail="Top not found")
    return top

@router.get("/ebenen/{ebene_id}")
def get_ebene(ebene_id: int, db: Session = Depends(get_db)):
    ebene = db.query(Ebene).get(ebene_id)
    if not ebene:
        raise HTTPException(status_code=404, detail="Ebene not found")
    return ebene

@router.get("/stiegen/{stiege_id}")
def get_stiege(stiege_id: int, db: Session = Depends(get_db)):
    stiege = db.query(Stiege).get(stiege_id)
    if not stiege:
        raise HTTPException(status_code=404, detail="Stiege not found")
    return stiege

@router.get("/bauteile/{bauteil_id}")
def get_bauteil(bauteil_id: int, db: Session = Depends(get_db)):
    bauteil = db.query(Bauteil).get(bauteil_id)
    if not bauteil:
        raise HTTPException(status_code=404, detail="Bauteil not found")
    return bauteil
