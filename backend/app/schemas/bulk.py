# app/schemas/bulk.py
from pydantic import BaseModel
from typing import Optional, List, Union
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
    topIds: Optional[List[int]] = None

class BulkUpdate(BaseModel):
    start_ist: Optional[Union[date, str]] = None  # ⬅️ PROMJENA
    end_ist:   Optional[Union[date, str]] = None  # ⬅️ PROMJENA
    status:    Optional[str] = None
    sub_id:    Optional[int] = None

class BulkBody(BaseModel):
    ids: Optional[List[int]] = None
    filters: Optional[BulkFilters] = None
    update: BulkUpdate
