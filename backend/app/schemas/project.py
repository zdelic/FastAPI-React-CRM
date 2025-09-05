from datetime import date
from pydantic import BaseModel
from typing import Optional

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None

class Project(BaseModel):
    id: int
    name: str
    description: Optional[str]
    start_date: Optional[date] = None

    class Config:
        orm_mode = True

class UserAssign(BaseModel):
    email: str

class ProjectUpdate(BaseModel):
    start_date: Optional[date] = None