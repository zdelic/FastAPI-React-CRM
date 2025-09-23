from pydantic import BaseModel, ConfigDict
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
    model_config = ConfigDict(from_attributes=True)

class TimelineTask(BaseModel):
    id: int
    # ⇩ OVO JE KLJUČNO: ova polja znaju biti None u tvojoj ruti
    task: Optional[str] = None
    wohnung: Optional[str] = None

    start_soll: date
    end_soll: date
    start_ist: Optional[date] = None
    end_ist: Optional[date] = None
    farbe: Optional[str] = None
    gewerk_name: Optional[str] = None
    top: Optional[str] = None
    ebene: Optional[str] = None
    stiege: Optional[str] = None
    bauteil: Optional[str] = None
    process_step_id: Optional[int] = None
    process_model: Optional[str] = None
    beschreibung: Optional[str] = None
    sub_id: Optional[int] = None
    sub_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
