# app/schemas/task.py
from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, AliasChoices

# === CREATE ===
class TaskCreate(BaseModel):
    top_id: int
    process_step_id: int
    start_soll: date
    end_soll: date

    # v2 stil (orm_mode zamjena)
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# === UPDATE ===
class TaskUpdate(BaseModel):
    start_soll: Optional[date] = None
    end_soll:   Optional[date] = None
    start_ist:  Optional[date] = None
    end_ist:    Optional[date] = None
    status:     Optional[str]  = None
    beschreibung: Optional[str] = None

    top_id:          Optional[int] = None
    process_step_id: Optional[int] = None
    project_id:      Optional[int] = None

    # Prihvati i "sub_id" i "subId" u requestu; serijaliziraj nazad kao "sub_id"
    sub_id: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("sub_id", "subId"),
        serialization_alias="sub_id",
    )

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# === READ ===
class TaskRead(TaskCreate):
    id: int
    start_ist: Optional[date] = None
    end_ist:   Optional[date] = None
    status:    Optional[str]  = None
    beschreibung: Optional[str] = None

    # Vraćamo i sub_id (uvijek kao snake_case)
    sub_id: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("sub_id", "subId"),
        serialization_alias="sub_id",
    )

    # Ako želiš, možeš dodati i project_id u Read (ostavio sam po potrebi)
    project_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# === TIMELINE DTO ===
class TimelineTask(BaseModel):
    id: int

    # ova polja znaju biti None iz tvoje rute
    task: Optional[str] = None
    wohnung: Optional[str] = None

    start_soll: date
    end_soll: date
    start_ist: Optional[date] = None
    end_ist:   Optional[date] = None

    farbe: Optional[str] = None
    gewerk_name: Optional[str] = None
    top: Optional[str] = None
    ebene: Optional[str] = None
    stiege: Optional[str] = None
    bauteil: Optional[str] = None
    process_step_id: Optional[int] = None
    process_model: Optional[str] = None
    beschreibung: Optional[str] = None

    sub_id: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("sub_id", "subId"),
        serialization_alias="sub_id",
    )
    sub_name: Optional[str] = None

    top_id: Optional[int] = None
    project_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
