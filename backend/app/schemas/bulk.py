# app/schemas/bulk.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class BulkFilters(BaseModel):
    gewerk: List[str] = []
    status: List[str] = []
    startDate: date | None = None
    endDate: date | None = None
    delayed: bool | None = None
    taskName: str | None = None
    tops: List[str] = []
    ebenen: List[str] = []
    stiegen: List[str] = []
    bauteile: List[str] = []
    activities: List[str] = []
    processModels: List[str] = []

class BulkUpdate(BaseModel):
    sub_id: int | None = None

class BulkBody(BaseModel):
    ids: Optional[List[int]] = None
    filters: Optional[BulkFilters] = None
    update: BulkUpdate
