
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.process import ProcessModel, ProcessStep
from app.schemas.process import ProcessModelCreate, ProcessModelRead

router = APIRouter()

@router.post("/process-models", response_model=ProcessModelRead)
def create_process_model(data: ProcessModelCreate, db: Session = Depends(get_db)):
    model = ProcessModel(name=data.name)
    for step_data in data.steps:
        step = ProcessStep(**step_data.dict())
        model.steps.append(step)
    db.add(model)
    db.commit()
    db.refresh(model)
    return model

@router.get("/process-models", response_model=List[ProcessModelRead])
def list_models(db: Session = Depends(get_db)):
    return db.query(ProcessModel).all()

@router.get("/process-models/{model_id}", response_model=ProcessModelRead)
def get_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(ProcessModel).filter_by(id=model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model

@router.delete("/process-models/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(ProcessModel).filter_by(id=model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(model)
    db.commit()
    return {"message": "Deleted"}

@router.put("/process-models/{model_id}", response_model=ProcessModelRead)
def update_process_model(model_id: int, data: ProcessModelCreate, db: Session = Depends(get_db)):
    model = db.query(ProcessModel).filter_by(id=model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.name = data.name
    model.steps.clear()  # izbriši stare stepove

    for step_data in data.steps:
        step = ProcessStep(**step_data.dict())
        model.steps.append(step)

    db.commit()
    db.refresh(model)
    return model