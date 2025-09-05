
from pydantic import BaseModel
from datetime import date
from typing import Optional, List

class TaskCreate(BaseModel):
    top_id: int
    process_step_id: int
    start_soll: date
    end_soll: date

class TaskUpdate(BaseModel):
    start_soll: Optional[date] = None
    end_soll:   Optional[date] = None
    start_ist:  Optional[date] = None
    end_ist:    Optional[date] = None
    status:     Optional[str] = None
    beschreibung: Optional[str] = None
    top_id:         Optional[int] = None
    process_step_id: Optional[int] = None
    project_id:      Optional[int] = None

class TaskRead(TaskCreate):
    id: int
    start_ist: Optional[date]
    end_ist: Optional[date]
    status: str
    beschreibung: Optional[str] = None

    class Config:
        from_attributes = True

class TimelineTask(BaseModel):
    id: int
    task: str
    wohnung: str
    start_soll: date
    end_soll: date
    start_ist: Optional[date]
    end_ist: Optional[date]
    farbe: Optional[str]
    gewerk_name: Optional[str]
    top: Optional[str]
    ebene: Optional[str]
    stiege: Optional[str]
    bauteil: Optional[str]
    process_step_id: Optional[int] = None
    process_model: Optional[str] = None
    beschreibung: Optional[str] = None

    class Config:
        from_attributes = True 

