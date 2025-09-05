from pydantic import BaseModel

class AktivitaetCreate(BaseModel):
    name: str
    gewerk_id: int

class AktivitaetRead(AktivitaetCreate):
    id: int

    class Config:
        from_attributes = True  # za Pydantic v2
