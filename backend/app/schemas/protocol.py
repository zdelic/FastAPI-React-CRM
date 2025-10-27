# app/schemas/protocol.py
from pydantic import BaseModel, ConfigDict
from typing import Any, Optional

class ProtocolRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: Optional[str] = None
    user_id: Optional[str] = None
    action: str
    ok: bool
    method: str | None = None
    path: str | None = None
    status_code: int | None = None
    ip: str | None = None
    user_agent: str | None = None
    details: Any | None = None

class ProtocolList(BaseModel):
    items: list[ProtocolRead]
    total: int
