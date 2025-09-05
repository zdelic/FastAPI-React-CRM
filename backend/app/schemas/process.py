
from pydantic import BaseModel
from typing import List

class ProcessStepCreate(BaseModel):
    gewerk_id: int
    activity: str
    duration_days: int
    parallel: bool
    order: int

class ProcessModelCreate(BaseModel):
    name: str
    steps: List[ProcessStepCreate]

class ProcessStepRead(ProcessStepCreate):
    id: int

    class Config:
        orm_mode = True

class ProcessModelRead(BaseModel):
    id: int
    name: str
    steps: List[ProcessStepRead]

    class Config:
        orm_mode = True
