from datetime import date
from pydantic import BaseModel, ConfigDict
from typing import Optional

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)

class ProjectRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    image_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    image_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class Project(BaseModel):
    id: int
    name: str
    description: Optional[str]
    start_date: Optional[date] = None

    class Config:
        from_attributes = True

class UserAssign(BaseModel):
    email: str

