from pydantic import BaseModel

class TopCreate(BaseModel):
    name: str
    ebene_id: int

class EbeneCreate(BaseModel):
    name: str
    stiege_id: int

class StiegeCreate(BaseModel):
    name: str
    bauteil_id: int

class BauteilCreate(BaseModel):
    name: str

class Top(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class Ebene(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class Stiege(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class Bauteil(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True
