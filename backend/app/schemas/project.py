from pydantic import BaseModel

class ProjectCreate(BaseModel):
    name: str
    description: str

class Project(BaseModel):
    id: int
    name: str
    description: str

    class Config:
        orm_mode = True

class UserAssign(BaseModel):
    email: str